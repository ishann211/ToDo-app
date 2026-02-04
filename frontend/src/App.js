import { useState } from "react";
import { getToken, logout, getUser } from "./auth";
import Login from "./Login";
import Register from "./Register";
import TodoApp from "./TodoApp"; // move your current todo UI into TodoApp.js
import "./index.css";
import "./App.css";

export default function App() {
  const [mode, setMode] = useState("login");
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) {
    return mode === "login" ? (
      <Login
        onLoggedIn={() => setAuthed(true)}
        goRegister={() => setMode("register")}
      />
    ) : (
      <Register
        onLoggedIn={() => setAuthed(true)}
        goLogin={() => setMode("login")}
      />
    );
  }

  const user = getUser();

  return (
    <div className="container">
      <div className="topbar card">
        <div className="user">
          Logged in as: <span className="muted">{user?.email}</span>
        </div>
        <div>
          <button
            className="btn ghost"
            onClick={() => {
              logout();
              setAuthed(false);
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <TodoApp />
    </div>
  );
}
