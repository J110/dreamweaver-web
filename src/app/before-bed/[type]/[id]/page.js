import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dreamvalley.app';

const TYPE_CONFIG = {
  'silly-songs': { label: 'Silly Song', emoji: '🎵', apiPath: 'silly-songs', coverDir: 'silly-songs' },
  'poems': { label: 'Musical Poem', emoji: '✨', apiPath: 'poems', coverDir: 'poems' },
};

async function fetchItem(type, id) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/${config.apiPath}/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function generateMetadata({ params }) {
  const { type, id } = await params;
  const config = TYPE_CONFIG[type];
  if (!config) {
    return { title: 'Before Bed | Dream Valley' };
  }

  const item = await fetchItem(type, id);
  if (!item) {
    return {
      title: `Before Bed — ${config.label} | Dream Valley`,
      description: `Listen to this ${config.label.toLowerCase()} before bedtime on Dream Valley.`,
    };
  }

  const title = `${item.title} — ${config.label} | Dream Valley`;
  const description = item.description ||
    `Listen to "${item.title}" — a ${config.label.toLowerCase()} for kids before bedtime on Dream Valley.`;
  const shareUrl = `https://dreamvalley.app/before-bed/${type}/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: shareUrl,
    },
    openGraph: {
      title: item.title,
      description,
      type: 'article',
      siteName: 'Dream Valley',
      url: shareUrl,
      locale: 'en_US',
      images: [{
        url: `https://dreamvalley.app/before-bed/${type}/${id}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: item.title,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description,
      images: [`https://dreamvalley.app/before-bed/${type}/${id}/opengraph-image`],
    },
  };
}

export default async function BeforeBedSharePage({ params }) {
  const { type, id } = await params;
  const config = TYPE_CONFIG[type];

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
        <p>Content not found.</p>
      </div>
    );
  }

  const item = await fetchItem(type, id);

  if (!item) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc', gap: '16px', padding: '24px' }}>
        <div style={{ fontSize: '48px' }}>{config.emoji}</div>
        <p style={{ fontSize: '18px', margin: 0 }}>This {config.label.toLowerCase()} is no longer available.</p>
        <Link href="/before-bed" style={{ color: '#6B4CE6', textDecoration: 'none', fontWeight: 600 }}>
          Browse Before Bed
        </Link>
      </div>
    );
  }

  const coverPath = item.cover_file ? `/covers/${config.coverDir}/${item.cover_file}` : null;
  const isSvg = item.cover_file?.endsWith('.svg');
  const ageLabel = item.age_group ? `Ages ${item.age_group}` : '';
  const duration = formatDuration(item.duration_seconds);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      maxWidth: '420px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Cover art */}
      <div style={{
        width: '220px',
        height: '220px',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'rgba(107, 76, 230, 0.1)',
        border: '1px solid rgba(107, 76, 230, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        {coverPath ? (
          isSvg ? (
            <object
              data={coverPath}
              type="image/svg+xml"
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
              aria-label={item.title}
            >
              <span style={{ fontSize: '64px' }}>{config.emoji}</span>
            </object>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverPath}
              alt={item.title}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            />
          )
        ) : (
          <span style={{ fontSize: '64px' }}>{config.emoji}</span>
        )}
      </div>

      {/* Type badge */}
      <div style={{
        display: 'inline-flex',
        padding: '4px 14px',
        background: 'rgba(107, 76, 230, 0.2)',
        border: '1px solid rgba(107, 76, 230, 0.3)',
        borderRadius: '12px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '12px', color: '#B8B3D8', letterSpacing: '1.5px', fontWeight: 500 }}>
          {config.emoji} {config.label.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: '26px',
        fontWeight: 700,
        color: '#FFD93D',
        textAlign: 'center',
        margin: '0 0 8px',
        lineHeight: 1.3,
      }}>
        {item.title}
      </h1>

      {/* Meta line */}
      <div style={{
        display: 'flex',
        gap: '12px',
        fontSize: '14px',
        color: 'rgba(200, 190, 230, 0.7)',
        marginBottom: '8px',
      }}>
        {duration && <span>{duration}</span>}
        {ageLabel && <span>{ageLabel}</span>}
      </div>

      {/* Description */}
      {item.description && (
        <p style={{
          fontSize: '15px',
          color: 'rgba(200, 190, 230, 0.8)',
          textAlign: 'center',
          lineHeight: 1.6,
          margin: '0 0 28px',
          maxWidth: '340px',
        }}>
          {item.description}
        </p>
      )}

      {/* Listen CTA */}
      <Link
        href="/before-bed"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 36px',
          background: 'linear-gradient(135deg, #6B4CE6, #FF6B9D)',
          borderRadius: '28px',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(107, 76, 230, 0.4)',
          transition: 'transform 0.2s',
        }}
      >
        Listen Now
      </Link>

      {/* Explore more */}
      <Link
        href="/before-bed"
        style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#6B4CE6',
          textDecoration: 'none',
        }}
      >
        Explore all Before Bed content
      </Link>
    </div>
  );
}
