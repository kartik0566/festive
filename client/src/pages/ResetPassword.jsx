import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient, getErrorMessage } from "../api/client.js";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { data } = await apiClient.post("/auth/password/reset", { email, token, password });
      setMessage(data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-page">
      <form className="form-panel flat password-panel" onSubmit={submit}>
        <span className="eyebrow">Secure account</span>
        <h1>Choose a new password</h1>
        <p>Set a password with at least 8 characters for {email || "your account"}.</p>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {error && <p className="form-message error" role="alert">{error}</p>}
        {message && <p className="form-message success" role="status">{message}</p>}
        {!message && (
          <button className="button primary full" type="submit" disabled={loading || !token || !email}>
            {loading ? "Updating password…" : "Update password"}
          </button>
        )}
        {message ? <p className="switch-auth"><Link to="/login">Continue to login</Link></p> : <p className="switch-auth"><Link to="/forgot-password">Request a new link</Link></p>}
      </form>
    </main>
  );
};

export default ResetPassword;
