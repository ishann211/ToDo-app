require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const todoRoutes = require("./routes/todos");
const auth = require("./middleware/auth");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

// Public auth routes
app.use("/api/auth", authRoutes);

// Protected todo routes
app.use("/api/todos", auth, todoRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
