import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

function normalizeTask(s) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [task, setTask] = useState("");
  const [error, setError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);

  const existingNormalized = useMemo(
    () => new Set(todos.map((t) => normalizeTask(t.task))),
    [todos],
  );

  async function loadTodos() {
    try {
      const res = await api.get("/todos");
      setTodos(res.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload(); // simplest way for now
        return;
      }
      setError("Failed to load todos");
    }
  }

  useEffect(() => {
    loadTodos().catch(() => setError("Failed to load todos"));
  }, []);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let reconnectDelay = 1000; // Start with 1 second
    const maxReconnectDelay = 30000; // Max 30 seconds
    let shouldReconnect = true;

    function connect() {
      if (!shouldReconnect) return;

      try {
        // In Docker: use /ws via nginx proxy, locally: use localhost:4001
        const wsUrl = process.env.REACT_APP_NOTIF_WS ||
          (window.location.hostname === 'localhost' && window.location.port === '3000'
            ? 'ws://localhost:4001'
            : `ws://${window.location.host}/ws`);
        ws = new WebSocket(wsUrl);
      } catch (e) {
        console.error("WS init error:", e);
        scheduleReconnect();
        return;
      }

      ws.addEventListener("open", () => {
        console.log("WS connected");
        setWsConnected(true);
        reconnectDelay = 1000; // Reset delay on successful connection
      });

      ws.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "notification") {
            setNotifications((prev) => [data, ...prev].slice(0, 10));
          }
        } catch (e) {
          // ignore malformed messages
        }
      });

      ws.addEventListener("close", () => {
        console.log("WS closed, will reconnect...");
        setWsConnected(false);
        scheduleReconnect();
      });

      ws.addEventListener("error", () => {
        // Error will trigger close, so reconnect happens there
      });
    }

    function scheduleReconnect() {
      if (!shouldReconnect) return;

      reconnectTimeout = setTimeout(() => {
        console.log(`Attempting WS reconnect (delay: ${reconnectDelay}ms)`);
        connect();
        // Exponential backoff
        reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      }, reconnectDelay);
    }

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    setError("");

    const trimmed = task.trim();

    // Frontend validations (fast feedback)
    if (trimmed.length < 2)
      return setError("Task must be at least 2 characters");
    if (trimmed.length > 255) return setError("Task must be <= 255 characters");

    // No duplicates (client-side)
    if (existingNormalized.has(normalizeTask(trimmed))) {
      return setError("That task already exists");
    }

    try {
      const res = await api.post("/todos", { task: trimmed });
      setTodos((prev) => [res.data, ...prev]);
      setTask("");
    } catch (err) {
      // Backend duplicate protection too
      if (err?.response?.status === 409) setError("That task already exists");
      else setError("Failed to add task");
    }
  }

  async function toggleComplete(todo) {
    try {
      const res = await api.put(`/todos/${todo.id}`, {
        completed: !todo.completed,
      });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.data : t)));
    } catch {
      setError("Failed to update task");
    }
  }

  async function updateTask(todo, newTask) {
    setError("");
    const trimmed = newTask.trim();

    if (trimmed.length < 2)
      return setError("Task must be at least 2 characters");
    if (trimmed.length > 255) return setError("Task must be <= 255 characters");

    const normalized = normalizeTask(trimmed);
    const currentNormalized = normalizeTask(todo.task);

    if (
      normalized !== currentNormalized &&
      existingNormalized.has(normalized)
    ) {
      return setError("That task already exists");
    }

    try {
      const res = await api.put(`/todos/${todo.id}`, { task: trimmed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.data : t)));
    } catch (err) {
      if (err?.response?.status === 409) setError("That task already exists");
      else setError("Failed to update task");
    }
  }

  async function deleteTodo(id) {
    setError("");
    try {
      await api.delete(`/todos/${id}`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Failed to delete task");
    }
  }

  return (
    <div className="todo-page card">
      <h1>Todo App</h1>

      <form onSubmit={addTodo} className="todo-form">
        <input
          className="input"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter a task..."
        />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <div className="notifications-panel">
        <div className="notifications-header">
          <h3>Notifications</h3>
          <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
        {notifications.length > 0 && (
          <ul className="notifications-list">
            {notifications.map((n, i) => (
              <li key={i} className="notification-item">
                <div className="notification-content">
                  <span className="notification-event">{n.event}</span>
                  <span className="notification-task">{n.metadata?.task || ""}</span>
                </div>
                <button
                  className="notification-dismiss"
                  onClick={() => setNotifications(prev => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {todos.map((t) => (
          <TodoItem
            key={t.id}
            todo={t}
            onToggle={() => toggleComplete(t)}
            onDelete={() => deleteTodo(t.id)}
            onUpdate={(newTask) => updateTask(t, newTask)}
          />
        ))}
      </ul>
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(todo.task);

  useEffect(() => setDraft(todo.task), [todo.task]);

  return (
    <li className="todo-item">
      <input type="checkbox" checked={todo.completed} onChange={onToggle} />

      {isEditing ? (
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      ) : (
        <span className={`todo-title ${todo.completed ? "completed" : ""}`}>
          {todo.task}
        </span>
      )}

      <div className="actions">
        {isEditing ? (
          <>
            <button
              className="btn small"
              onClick={() => {
                onUpdate(draft);
                setIsEditing(false);
              }}
            >
              Save
            </button>
            <button
              className="btn ghost small"
              onClick={() => {
                setDraft(todo.task);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn small" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="btn ghost small" onClick={onDelete}>
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
