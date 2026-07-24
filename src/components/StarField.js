'use client';

import { useEffect, useState } from 'react';

export default function StarField() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const generateStars = () => {
      const starArray = Array.from({ length: 60 }, (_, i) => {
        const fireflyColumn = i % 8;
        const fireflyRow = Math.floor(i / 8);
        const premiumFirefly = i < 40;

        return {
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: Math.random() * 2 + 0.5,
          duration: Math.random() * 3 + 2,
          delay: Math.random() * 5,
          fireflyLeft: premiumFirefly
            ? ((fireflyColumn + 0.2 + Math.random() * 0.6) / 8) * 100
            : 0,
          fireflyTop: premiumFirefly
            ? ((fireflyRow + 0.2 + Math.random() * 0.6) / 5) * 100
            : 0,
          waypoints: Array.from({ length: 5 }, () => ({
            x: Math.round(Math.random() * 120 - 60),
            y: Math.round(Math.random() * 100 - 50),
          })),
          wanderDuration: Math.random() * 14 + 18,
          wanderDelay: -(Math.random() * 32),
          glowDuration: Math.random() * 4 + 3,
          glowDelay: -(Math.random() * 7),
        };
      });
      setStars(starArray);
    };

    generateStars();
  }, []);

  return (
    <div className="star-field">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            '--star-twinkle-duration': `${star.duration}s`,
            '--star-twinkle-delay': `${star.delay}s`,
            '--firefly-left': `${star.fireflyLeft}%`,
            '--firefly-top': `${star.fireflyTop}%`,
            ...Object.fromEntries(star.waypoints.flatMap((point, index) => [
              [`--firefly-x${index + 1}`, `${point.x}px`],
              [`--firefly-y${index + 1}`, `${point.y}px`],
            ])),
            '--firefly-wander-duration': `${star.wanderDuration}s`,
            '--firefly-wander-delay': `${star.wanderDelay}s`,
            '--firefly-glow-duration': `${star.glowDuration}s`,
            '--firefly-glow-delay': `${star.glowDelay}s`,
          }}
        />
      ))}
    </div>
  );
}
