import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="page center-page">
    <section className="narrow-panel">
      <h1>Page not found</h1>
      <p>The page you opened is not available.</p>
      <Link className="button primary" to="/">
        Go home
      </Link>
    </section>
  </main>
);

export default NotFound;

