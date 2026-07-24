'use client';

import { useEffect, useState } from 'react';

export default function StarField() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const generateStars = () => {
      const starArray = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
        driftX: Math.round(Math.random() * 80 - 40),
        driftY: Math.round(Math.random() * 70 - 35),
        midX: Math.round(Math.random() * 50 - 25),
        midY: Math.round(Math.random() * 50 - 25),
      }));
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
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            '--firefly-drift-x': `${star.driftX}px`,
            '--firefly-drift-y': `${star.driftY}px`,
            '--firefly-mid-x': `${star.midX}px`,
            '--firefly-mid-y': `${star.midY}px`,
          }}
        />
      ))}
    </div>
  );
}
