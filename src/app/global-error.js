'use client';

export default function GlobalError({ error, reset }) {
  const message =
    (error && typeof error === 'object' && error.message) ||
    'Something went wrong.';

  return (
    <html>
      <body
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>{message}</p>
        <button
          onClick={() => reset?.()}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: '#5b6cff',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
