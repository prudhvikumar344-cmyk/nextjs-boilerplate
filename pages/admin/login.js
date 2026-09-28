import { useState } from 'react';
import Head from 'next/head';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not log in.');
        setSubmitting(false);
        return;
      }
      window.location.href = '/admin';
    } catch (err) {
      setError('Network error, please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Admin login</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="wrap">
        <h1>Admin login</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
      <style jsx>{`
        .wrap { max-width: 360px; margin: 80px auto; padding: 0 20px; font-family: -apple-system, Inter, sans-serif; color: #1f2937; }
        h1 { font-size: 24px; margin-bottom: 20px; }
        form { display: flex; flex-direction: column; gap: 16px; }
        label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: #374151; }
        input { font: inherit; font-weight: 400; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; }
        input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
        button { background: #4f46e5; color: white; border: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { color: #b91c1c; font-size: 14px; }
      `}</style>
    </>
  );
}
