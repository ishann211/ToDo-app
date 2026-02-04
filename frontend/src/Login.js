import { useState } from "react";
import { api } from "./api";
import { setAuth } from "./auth";

export default function Login({ onLoggedIn, goRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.token, res.data.user);
      onLoggedIn();
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="auth-page card">
      <h2>Login</h2>
      <form onSubmit={submit} className="auth-form">
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn">Login</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button
        className="btn ghost"
        onClick={goRegister}
        style={{ marginTop: 10 }}
      >
        Go to Register
      </button>
    </div>
  );
}
