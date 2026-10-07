import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getErrorMessage, apiClient } from "../api/client.js";

const ForgotPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPath, setResetPath] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetPath("");
    try {
      const { data } = await apiClient.post("/auth/password/forgot", { email });
      setMessage(data.message);
      if (data.token) {
        setResetPath(`/reset-password?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.email || email)}`);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-page">
      <form className="form-panel flat password-panel" onSubmit={submit}>
        <span className="eyebrow">Account recovery</span>
        <h1>Forgot your password?</h1>
        <p>Enter the email address on your account and we’ll send a one-time reset link.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        {error && <p className="form-message error" role="alert">{error}</p>}
        {message && <p className="form-message success" role="status">{message}</p>}
        {resetPath ? (
          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <Link className="button primary full" to={resetPath}>
              Set New Password Now &rarr;
            </Link>
          </div>
        ) : (
          <button className="button primary full" type="submit" disabled={loading}>
            {loading ? "Sending link…" : "Send reset link"}
          </button>
        )}
        <p className="switch-auth"><Link to="/login">Back to login</Link></p>
      </form>
    </main>
  );
};

export default ForgotPassword;
