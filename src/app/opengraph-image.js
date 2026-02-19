import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Dream Valley - Magical Bedtime Stories for Kids';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Stars scattered across the canvas (avoiding center where logo sits)
const STARS = [
  { x: 60, y: 40, s: 3, c: '#FFD93D', o: 0.8 },
  { x: 180, y: 25, s: 3, c: '#FFF3CD', o: 0.7 },
  { x: 350, y: 45, s: 2, c: '#FFD93D', o: 0.6 },
  { x: 850, y: 30, s: 3, c: '#FFF3CD', o: 0.75 },
  { x: 1020, y: 50, s: 4, c: '#FFD93D', o: 0.7 },
  { x: 1140, y: 35, s: 3, c: '#FFF3CD', o: 0.6 },
  { x: 50, y: 150, s: 2, c: '#FF6B9D', o: 0.4 },
  { x: 1150, y: 130, s: 2, c: '#FF6B9D', o: 0.35 },
  { x: 30, y: 350, s: 2, c: '#FFF3CD', o: 0.3 },
  { x: 1160, y: 320, s: 2, c: '#FFD93D', o: 0.3 },
  { x: 80, y: 550, s: 2, c: '#FFD93D', o: 0.2 },
  { x: 1100, y: 530, s: 2, c: '#FFF3CD', o: 0.2 },
  // Sparkle stars
  { x: 130, y: 60, s: 5, c: '#FFD93D', o: 0.6, glow: true },
  { x: 1060, y: 80, s: 6, c: '#FFF3CD', o: 0.5, glow: true },
  { x: 200, y: 520, s: 4, c: '#FFD93D', o: 0.3, glow: true },
];

export default async function Image() {
  // Load Quicksand font and logo in parallel
  const [quicksandBold, quicksandRegular, logoData] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/quicksand/v37/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkBgv18E.ttf')
      .then((res) => res.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/quicksand/v37/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkP8o18E.ttf')
      .then((res) => res.arrayBuffer()),
    fetch(new URL('/public/logo-og.png', import.meta.url))
      .then((res) => res.arrayBuffer()),
  ]);

  // Convert logo to base64 data URI
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          // Background matches logo's dark purple-black
          background: 'linear-gradient(135deg, #140525 0%, #1B0932 30%, #1E0A3A 55%, #140525 100%)',
        }}
      >
        {/* Subtle nebula washes at edges */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(107,76,230,0.15) 0%, rgba(107,76,230,0.05) 40%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,157,0.1) 0%, rgba(255,107,157,0.03) 40%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '300px',
            width: '500px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(78,205,196,0.06) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Star field */}
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
              boxShadow: star.glow
                ? `0 0 ${star.s * 2}px ${star.s}px ${star.c}40`
                : 'none',
              display: 'flex',
            }}
          />
        ))}

        {/* Logo — centered, large */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginBottom: '-20px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoBase64}
            width={440}
            height={440}
            alt="Dream Valley"
            style={{ position: 'relative', zIndex: 1 }}
          />
        </div>

        {/* Subtitle below logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Decorative line */}
          <div
            style={{
              width: '240px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #6B4CE6, transparent)',
              marginBottom: '14px',
              borderRadius: '1px',
              display: 'flex',
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: '28px',
              fontWeight: 400,
              color: '#B8B3D8',
              letterSpacing: '4px',
              display: 'flex',
            }}
          >
            Magical Bedtime Stories
          </div>

          {/* URL */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: '18px',
              fontWeight: 400,
              color: '#6B4CE6',
              letterSpacing: '5px',
              marginTop: '12px',
              opacity: 0.7,
              display: 'flex',
            }}
          >
            dreamvalley.app
          </div>
        </div>

        {/* Rolling hills at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '-35px',
            left: '-50px',
            width: '500px',
            height: '80px',
            borderRadius: '50%',
            background: '#1B0932',
            opacity: 0.5,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '350px',
            width: '550px',
            height: '65px',
            borderRadius: '50%',
            background: '#1E0A3A',
            opacity: 0.4,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            right: '-50px',
            width: '500px',
            height: '75px',
            borderRadius: '50%',
            background: '#1B0932',
            opacity: 0.5,
            display: 'flex',
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
