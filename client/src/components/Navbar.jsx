import { CalendarDays, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/#services", label: "Services" },
    { to: "/#packages", label: "Packages" },
    { to: "/#reviews", label: "Reviews" }
  ];

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Festive Events home">
        <span className="brand-wordmark">
          <strong>Festive Events</strong>
          <small>Planning Studio</small>
        </span>
      </Link>

      <button className="icon-button mobile-only" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <nav className={open ? "nav-links is-open" : "nav-links"}>
        {links.map((link) =>
          link.to.includes("#") ? (
            <a key={link.to} href={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ) : (
            <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="button ghost compact">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <span className="user-chip">
              <UserRound size={16} />
              {user?.role}
            </span>
            <button className="icon-button" onClick={onLogout} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="button ghost compact">
              <UserRound size={18} />
              <span>Login</span>
            </Link>
            <Link to="/register" className="button primary compact">
              <CalendarDays size={18} />
              <span>Book</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
