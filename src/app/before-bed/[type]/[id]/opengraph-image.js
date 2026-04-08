import { ImageResponse } from 'next/og';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dreamvalley.app';

export const runtime = 'edge';
export const alt = 'Dream Valley — Before Bed';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_CONFIG = {
  'funny-shorts': { label: 'FUNNY SHORT', emoji: '😂', apiPath: 'funny-shorts', accent: '#FF6B9D' },
  'silly-songs': { label: 'SILLY SONG', emoji: '🎵', apiPath: 'silly-songs', accent: '#FFD93D' },
  'poems': { label: 'MUSICAL POEM', emoji: '✨', apiPath: 'poems', accent: '#4ECDC4' },
};

const STARS = [
  { x: 620, y: 30, s: 3, c: '#FFD93D', o: 0.8 },
  { x: 720, y: 55, s: 4, c: '#FFF3CD', o: 0.75 },
  { x: 850, y: 25, s: 3, c: '#FFD93D', o: 0.7 },
  { x: 960, y: 45, s: 3, c: '#FFF3CD', o: 0.6 },
  { x: 1100, y: 35, s: 4, c: '#FFD93D', o: 0.65 },
  { x: 680, y: 90, s: 2, c: '#FF6B9D', o: 0.4 },
  { x: 780, y: 120, s: 2, c: '#FFF3CD', o: 0.35 },
  { x: 1140, y: 100, s: 2, c: '#FFD93D', o: 0.4 },
  { x: 1150, y: 280, s: 2, c: '#FFF3CD', o: 0.3 },
  { x: 650, y: 560, s: 2, c: '#FFD93D', o: 0.25 },
  { x: 1120, y: 500, s: 2, c: '#FFF3CD', o: 0.2 },
  { x: 790, y: 40, s: 6, c: '#FFD93D', o: 0.6 },
  { x: 1060, y: 70, s: 5, c: '#FFF3CD', o: 0.5 },
];

export default async function Image({ params }) {
  const { type, id } = await params;
  const config = TYPE_CONFIG[type];

  const [quicksandBold, quicksandRegular, logoData] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/quicksand/v37/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkBgv18E.ttf')
      .then((res) => res.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/quicksand/v37/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkP8o18E.ttf')
      .then((res) => res.arrayBuffer()),
    fetch(new URL('/public/logo-og.png', import.meta.url))
      .then((res) => res.arrayBuffer()),
  ]);

  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  let title = 'Before Bed';
  let accent = '#FF6B9D';
  let typeLabel = 'BEFORE BED';

  if (config) {
    accent = config.accent;
    typeLabel = config.label;
    try {
      const res = await fetch(`${API_URL}/api/v1/${config.apiPath}/${id}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.title) title = json.data.title;
      }
    } catch { /* use fallback */ }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #140525 0%, #1B0932 30%, #1E0A3A 55%, #140525 100%)',
        }}
      >
        {/* Nebula effects */}
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(107,76,230,0.15) 0%, rgba(107,76,230,0.05) 40%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '100px',
            width: '400px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,157,0.08) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Stars */}
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${star.x}px`,
              top: `${star.y}px`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              borderRadius: '50%',
              background: star.c,
              opacity: star.o,
              display: 'flex',
            }}
          />
        ))}

        {/* Logo (left side) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '500px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoBase64}
            width={460}
            height={460}
            alt="Dream Valley"
            style={{ position: 'relative', zIndex: 1 }}
          />
        </div>

        {/* Separator */}
        <div
          style={{
            position: 'absolute',
            left: '490px',
            top: '120px',
            width: '2px',
            height: '390px',
            background: 'linear-gradient(180deg, transparent, rgba(107,76,230,0.4), rgba(255,107,157,0.3), transparent)',
            display: 'flex',
          }}
        />

        {/* Text content (right) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            flex: 1,
            paddingRight: '70px',
            paddingLeft: '40px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: title.length > 35 ? '36px' : '44px',
              fontWeight: 700,
              color: '#FFD93D',
              lineHeight: 1.3,
              textShadow: '0 0 20px rgba(255,217,61,0.3), 0 2px 8px rgba(0,0,0,0.3)',
              maxWidth: '580px',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Decorative line */}
          <div
            style={{
              width: '180px',
              height: '2px',
              background: `linear-gradient(90deg, ${accent}, ${accent}33)`,
              marginTop: '18px',
              marginBottom: '18px',
              borderRadius: '1px',
              display: 'flex',
            }}
          />

          {/* Type badge */}
          <div
            style={{
              display: 'flex',
              padding: '6px 18px',
              background: 'rgba(107,76,230,0.3)',
              border: '1px solid rgba(107,76,230,0.5)',
              borderRadius: '14px',
            }}
          >
            <span
              style={{
                fontFamily: 'Quicksand',
                fontSize: '16px',
                fontWeight: 400,
                color: '#B8B3D8',
                letterSpacing: '3px',
              }}
            >
              {typeLabel}
            </span>
          </div>

          {/* "Before Bed" label */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: '20px',
              fontWeight: 400,
              color: accent,
              marginTop: '16px',
              opacity: 0.7,
              display: 'flex',
            }}
          >
            Before Bed
          </div>

          {/* URL */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: '18px',
              fontWeight: 400,
              color: '#6B4CE6',
              letterSpacing: '4px',
              marginTop: '12px',
              opacity: 0.8,
              display: 'flex',
            }}
          >
            dreamvalley.app
          </div>
        </div>

        {/* Hills */}
        <div
          style={{
            position: 'absolute', bottom: '-35px', left: '-50px',
            width: '500px', height: '80px', borderRadius: '50%',
            background: '#1B0932', opacity: 0.5, display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-30px', left: '350px',
            width: '550px', height: '65px', borderRadius: '50%',
            background: '#1E0A3A', opacity: 0.4, display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-40px', right: '-50px',
            width: '500px', height: '75px', borderRadius: '50%',
            background: '#1B0932', opacity: 0.5, display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Quicksand', data: quicksandBold, weight: 700, style: 'normal' },
        { name: 'Quicksand', data: quicksandRegular, weight: 400, style: 'normal' },
      ],
    },
  );
}
