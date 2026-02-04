import { useState } from "react";
import { api } from "./api";
import { setAuth } from "./auth";

export default function Register({ onLoggedIn, goLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/register", { name, email, password });
      setAuth(res.data.token, res.data.user);
      onLoggedIn();
    } catch (err) {
      setError(err?.response?.data?.message || "Register failed");
    }
  }

  return (
    <div className="auth-page card">
      <h2>Register</h2>
      <form onSubmit={submit} className="auth-form">
        <input
          className="input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <button className="btn">Create account</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button className="btn ghost" onClick={goLogin} style={{ marginTop: 10 }}>
        Go to Login
      </button>
    </div>
  );
}
