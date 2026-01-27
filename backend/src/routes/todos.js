const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../db");
const eventBus = require("../eventBus");

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
}

const taskValidators = [
  body("task")
    .trim()
    .notEmpty()
    .withMessage("Task is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Task must be 2-255 characters"),
];

const idValidator = [param("id").isInt({ min: 1 }).withMessage("Invalid id")];

// GET /api/todos (only logged-in user's todos)
router.get("/", async (req, res) => {
  const userId = req.user.userId;
  const [rows] = await pool.query(
    "SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC",
    [userId],
  );
  res.json(rows);
});

// POST /api/todos
router.post("/", taskValidators, async (req, res) => {
  const bad = handleValidation(req, res);
  if (bad) return;

  const userId = req.user.userId;
  const task = req.body.task.trim();

  try {
    const [result] = await pool.query(
      "INSERT INTO todos (task, user_id) VALUES (?, ?)",
      [task, userId],
    );

    const [rows] = await pool.query(
      "SELECT * FROM todos WHERE id = ? AND user_id = ?",
      [result.insertId, userId],
    );

    // Prepare event payload
    const payload = {
      event: "TodoCreated",
      entityId: result.insertId,
      timestamp: new Date().toISOString(),
      metadata: { userId, task },
    };

    // Publish non-blocking (fire-and-forget). Log any publish errors.
    eventBus
      .publish("TodoCreated", payload)
      .catch((err) =>
        console.error("Failed to publish TodoCreated event:", err),
      );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Task already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/todos/:id
router.put(
  "/:id",
  [
    ...idValidator,
    body("task").optional().trim().isLength({ min: 2, max: 255 }),
    body("completed")
      .optional()
      .isBoolean()
      .withMessage("completed must be boolean"),
  ],
  async (req, res) => {
    const bad = handleValidation(req, res);
    if (bad) return;

    const userId = req.user.userId;
    const { id } = req.params;
    const { task, completed } = req.body;

    const fields = [];
    const values = [];

    if (task !== undefined) {
      const t = String(task).trim();
      if (!t) return res.status(400).json({ message: "Task cannot be empty" });
      fields.push("task = ?");
      values.push(t);
    }
    if (completed !== undefined) {
      fields.push("completed = ?");
      values.push(Boolean(completed));
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    values.push(id, userId);

    try {
      const [result] = await pool.query(
        `UPDATE todos SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
        values,
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Todo not found" });
      }

      const [rows] = await pool.query(
        "SELECT * FROM todos WHERE id = ? AND user_id = ?",
        [id, userId],
      );

      res.json(rows[0]);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Task already exists" });
      }
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// DELETE /api/todos/:id
router.delete("/:id", idValidator, async (req, res) => {
  const bad = handleValidation(req, res);
  if (bad) return;

  const userId = req.user.userId;
  const { id } = req.params;

  const [result] = await pool.query(
    "DELETE FROM todos WHERE id = ? AND user_id = ?",
    [id, userId],
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Todo not found" });
  }

  res.status(204).send();
});

module.exports = router;
