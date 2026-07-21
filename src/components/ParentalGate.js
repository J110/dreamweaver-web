'use client';

import { useCallback, useRef, useState } from 'react';

function newChallenge() {
  const a = 3 + Math.floor(Math.random() * 6);
  const b = 2 + Math.floor(Math.random() * 6);
  return { a, b, answer: a * b };
}

// Imperative parental gate. `runGate()` shows the challenge and resolves
// Promise<boolean> (true = adult passed, false = cancelled). Wire it as the
// { gate } wrapper on purchaseNative so no StoreKit charge starts until an
// adult passes. `gate` is the element to render; null when idle.
export function useParentalGate() {
  const [challenge, setChallenge] = useState(null);
  const resolverRef = useRef(null);

  const runGate = useCallback(() => {
    setChallenge(newChallenge());
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((passed) => {
    setChallenge(null);
    const r = resolverRef.current;
    resolverRef.current = null;
    if (r) r(passed);
  }, []);

  const gate = challenge ? (
    <ParentalGateModal
      challenge={challenge}
      onPass={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { runGate, gate };
}

function ParentalGateModal({ challenge, onPass, onCancel }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (parseInt(value, 10) === challenge.answer) onPass();
    else {
      setWrong(true);
      setValue('');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask a grown-up"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6,4,20,0.72)',
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 340,
          background: '#141130',
          border: '1px solid rgba(185,163,255,0.28)',
          borderRadius: 18,
          padding: '22px 20px',
          color: '#f8f6ff',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>
          Ask a grown-up
        </p>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 16px' }}>
          To continue to payment, please solve this.
        </p>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          {challenge.a} × {challenge.b} = ?
        </p>
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
          }}
          aria-label="Answer"
          style={{
            width: '100%',
            padding: '11px 14px',
            borderRadius: 12,
            border: wrong ? '2px solid #ff8a8a' : '1px solid rgba(248,246,255,0.22)',
            background: 'rgba(255,255,255,0.05)',
            color: '#f8f6ff',
            fontSize: '1.1rem',
            textAlign: 'center',
            marginBottom: wrong ? 6 : 16,
          }}
        />
        {wrong && (
          <p style={{ color: '#ff8a8a', fontSize: '0.8rem', margin: '0 0 12px' }}>
            Not quite — try again.
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 12,
              border: '1px solid rgba(248,246,255,0.22)',
              background: 'transparent',
              color: '#f8f6ff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 12,
              border: 'none',
              background: '#b9a3ff',
              color: '#141130',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
