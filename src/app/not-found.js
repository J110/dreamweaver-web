export const metadata = {
  title: 'Page not found · Dream Valley',
};

export default function NotFound() {
  return (
    <main
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
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        Page not found
      </h1>
      <p style={{ opacity: 0.75, marginBottom: '1.5rem' }}>
        The page you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <a
        href="/"
        style={{
          padding: '10px 18px',
          borderRadius: 8,
          background: '#5b6cff',
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        Go home
      </a>
    </main>
  );
}
