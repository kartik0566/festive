import { LoaderCircle, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getFirebaseSignInToken } from "../firebaseAuth.js";

const Login = ({ mode }) => {
  const isRegister = mode === "register";
  const { isAuthenticated, login, loginWithFirebaseIdToken, register, verifyLoginOtp, verifyEmail, resendVerificationOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from || "/dashboard";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "client"
  });
  const [step, setStep] = useState("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [message, setMessage] = useState(location.state?.notice || "");
  const [loading, setLoading] = useState(false);
  const [socialProvider, setSocialProvider] = useState("");
  const [slowConnection, setSlowConnection] = useState(false);
  const pendingTimer = useRef(null);

  const startLoading = () => {
    window.clearTimeout(pendingTimer.current);
    setLoading(true);
    setSlowConnection(false);
    pendingTimer.current = window.setTimeout(() => setSlowConnection(true), 5000);
  };

  const stopLoading = () => {
    window.clearTimeout(pendingTimer.current);
    setLoading(false);
    setSlowConnection(false);
  };

  useEffect(() => () => window.clearTimeout(pendingTimer.current), []);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    startLoading();
    setMessage("");

    try {
      if (step === "emailOtp") {
        await verifyEmail({
          email: pendingEmail || form.email,
          otp
        });
        setOtp("");
        setDevOtp("");
        setStep("credentials");
        setMessage("Email verified. Please login to receive your login OTP.");
        return;
      }

      if (step === "loginOtp") {
        await verifyLoginOtp({
          email: pendingEmail || form.email,
          otp
        });
        navigate(redirectTo);
        return;
      }

      const data = isRegister
        ? await register(form)
        : await login({
            email: form.email,
            password: form.password
          });

      if (data?.requiresEmailVerification) {
        setPendingEmail(data.email || form.email);
        setDevOtp(data.devOtp || "");
        if (data?.devOtp) {
          setOtp(data.devOtp);
        }
        setStep("emailOtp");
        setMessage(data.message || "Enter the email verification OTP sent to your inbox.");
        return;
      }

      if (data?.requiresOtp) {
        setPendingEmail(data.email || form.email);
        setDevOtp(data.devOtp || "");
        if (data?.devOtp) {
          setOtp(data.devOtp);
        }
        setStep("loginOtp");
        setMessage(data.message || "Enter the login OTP sent to your inbox.");
        return;
      }

      if (data?.token) {
        navigate(redirectTo);
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      stopLoading();
    }
  };

  const resendOtp = async () => {
    startLoading();
    setMessage("");

    try {
      const data =
        step === "emailOtp"
          ? await resendVerificationOtp(pendingEmail || form.email)
          : await login({
              email: pendingEmail || form.email,
              password: form.password
            });

      setDevOtp(data.devOtp || "");
      if (data?.devOtp) {
        setOtp(data.devOtp);
      }
      setMessage(data.message || "OTP sent again.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      stopLoading();
    }
  };

  const signInWithProvider = async (providerName) => {
    startLoading();
    setSocialProvider(providerName);
    setMessage("");

    try {
      const idToken = await getFirebaseSignInToken(providerName);
      await loginWithFirebaseIdToken(idToken);
      navigate(redirectTo);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setSocialProvider("");
      stopLoading();
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setDevOtp("");
    setMessage("");
  };

  return (
    <main className={`auth-page ${isRegister ? "auth-register" : "auth-login"}`}>
      <section className="auth-visual">
        <div>
          <span className="eyebrow">Festive Events</span>
          <h1>{isRegister ? "Create your event account" : "Welcome back"}</h1>
          <p>
            Clients can request events, review proposals, download invoices, make payments, track event status, and
            share reviews from one private dashboard.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="form-panel flat" onSubmit={submit}>
          <h2>
            {step === "emailOtp" && "Verify email"}
            {step === "loginOtp" && "Login OTP"}
            {step === "credentials" && (isRegister ? "Register" : "Login")}
          </h2>

          {step !== "credentials" && (
            <>
              <p className="demo-note">
                OTP sent to <strong>{pendingEmail || form.email}</strong>.
              </p>
              <label>
                OTP
                <input
                  name="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  inputMode="numeric"
                  maxLength="6"
                  required
                />
              </label>
              {devOtp && (
                <p className="form-message success">
                  One-Time Passcode (OTP): <strong>{devOtp}</strong>
                </p>
              )}
            </>
          )}

          {step === "credentials" && isRegister && (
            <>
              <label>
                Full name
                <span className="input-icon">
                  <UserRound size={18} />
                  <input name="name" value={form.name} onChange={update} required />
                </span>
              </label>
              <label>
                Phone
                <span className="input-icon">
                  <Phone size={18} />
                  <input name="phone" value={form.phone} onChange={update} />
                </span>
              </label>
            </>
          )}

          {step === "credentials" && (
            <>
              <label>
                Email
                <span className="input-icon">
                  <Mail size={18} />
                  <input type="email" name="email" value={form.email} onChange={update} required />
                </span>
              </label>
              {!isRegister && (
                <div className="auth-form-links">
                  <Link to="/forgot-password" state={{ email: form.email }}>Forgot password?</Link>
                </div>
              )}
              <label>
                Password
                <span className="input-icon">
                  <LockKeyhole size={18} />
                  <input type="password" name="password" value={form.password} onChange={update} required />
                </span>
              </label>
            </>
          )}

          {message && <p className="form-message error">{message}</p>}
          <button className="button primary full login-submit" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <LoaderCircle className="loading-icon" size={18} aria-hidden="true" />
                {slowConnection
                  ? "Still connecting…"
                  : step === "credentials"
                    ? isRegister
                      ? "Creating your account…"
                      : "Checking details & sending code…"
                    : "Verifying your code…"}
              </>
            )
              : step === "emailOtp"
                ? "Verify Email"
                : step === "loginOtp"
                  ? "Verify Login"
                  : isRegister
                    ? "Create Account"
                    : "Send Login OTP"}
          </button>
          {step === "credentials" && (
            <>
              <div className="social-divider"><span>or continue with</span></div>
              <div className="social-login-buttons">
                <button
                  className="button social-button"
                  type="button"
                  onClick={() => signInWithProvider("google")}
                  disabled={loading}
                >
                  <span className="social-mark google-mark" aria-hidden="true">G</span>
                  {socialProvider === "google" ? "Connecting…" : "Google"}
                </button>
                <button
                  className="button social-button"
                  type="button"
                  onClick={() => signInWithProvider("facebook")}
                  disabled={loading}
                >
                  <span className="social-mark facebook-mark" aria-hidden="true">f</span>
                  {socialProvider === "facebook" ? "Connecting…" : "Facebook"}
                </button>
              </div>
            </>
          )}
          {loading && slowConnection && (
            <p className="auth-wait-note" role="status">
              Render may be waking the server after inactivity. This first connection can take about a minute.
            </p>
          )}

          {step !== "credentials" && (
            <div className="otp-actions">
              <button className="button ghost full" type="button" onClick={resendOtp} disabled={loading}>
                Resend OTP
              </button>
              <button className="button ghost full" type="button" onClick={backToCredentials}>
                Back
              </button>
            </div>
          )}

          {step === "credentials" && (
            <p className="switch-auth">
              {isRegister ? "Already have an account?" : "New client?"}{" "}
              <Link to={isRegister ? "/login" : "/register"} state={location.state}>
                {isRegister ? "Login" : "Register"}
              </Link>
            </p>
          )}
        </form>
      </section>
    </main>
  );
};

export default Login;
