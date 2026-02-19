import { ImageResponse } from 'next/og';
import { SEED_STORIES } from '@/utils/seedData';

export const runtime = 'edge';
export const alt = 'Dream Valley Story';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Stars — only on right half (text side) so they don't clash with the logo's own stars
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
  // Sparkle stars
  { x: 790, y: 40, s: 6, c: '#FFD93D', o: 0.6, glow: true },
  { x: 1060, y: 70, s: 5, c: '#FFF3CD', o: 0.5, glow: true },
];

export default async function Image({ params }) {
  const { id } = await params;

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

  // Look up story in seed data
  const allStories = [...(SEED_STORIES.en || []), ...(SEED_STORIES.hi || [])];
  const story = allStories.find((s) => s.id === id);
  const title = story?.title || 'A Magical Bedtime Story';
  const storyType = story?.type === 'poem' ? 'POEM' : story?.type === 'song' ? 'SONG' : 'STORY';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          // Background matches logo's dark purple-black (#170729 range)
          background: 'linear-gradient(135deg, #140525 0%, #1B0932 30%, #1E0A3A 55%, #140525 100%)',
        }}
      >
        {/* Subtle nebula wash on right side only */}
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

        {/* Star field (right side only) */}
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

        {/* Logo section (left side) — logo fills this area, its own bg blends with ours */}
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

        {/* Vertical separator glow line */}
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

        {/* Text content (right side) */}
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
          {/* Story title */}
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
              background: 'linear-gradient(90deg, #6B4CE6, rgba(107,76,230,0.2))',
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
              {storyType}
            </span>
          </div>

          {/* URL */}
          <div
            style={{
              fontFamily: 'Quicksand',
              fontSize: '18px',
              fontWeight: 400,
              color: '#6B4CE6',
              letterSpacing: '4px',
              marginTop: '22px',
              opacity: 0.8,
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
