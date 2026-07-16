import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', textAlign: 'center', padding: 20 }}>
      <h1 style={{ fontSize: '100px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginTop: 10 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginTop: 10, marginBottom: 30 }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Go Back Home
      </Link>
    </div>
  );
}
