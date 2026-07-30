'use client';

import { useEffect, useRef } from 'react';

export default function PaidGenerationDialog({ quote, onConfirm, onCancel, confirming, title, body, confirmLabel, cancelLabel }) {
  const dialog = useRef(null);
  const confirm = useRef(null);

  useEffect(() => {
    const returnFocus = document.activeElement;
    confirm.current?.focus();
    return () => returnFocus?.focus?.();
  }, []);

  useEffect(() => {
    if (confirming) dialog.current?.focus();
  }, [confirming]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirming) return;
      onCancel();
      return;
    }
    if (event.key === 'Tab') {
      const controls = dialog.current?.querySelectorAll('button:not([disabled])') || [];
      if (!controls.length) {
        event.preventDefault();
        dialog.current?.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div ref={dialog} className="characterPaidDialog" role="dialog" aria-modal="true" aria-labelledby="paid-generation-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <h2 id="paid-generation-title">{title}</h2>
      <p>{body.replace('{cost}', quote.credit_cost).replace('{balance}', quote.credits_after)}</p>
      <button type="button" onClick={onCancel} disabled={confirming}>{cancelLabel}</button>
      <button ref={confirm} type="button" onClick={onConfirm} disabled={confirming}>{confirmLabel}</button>
    </div>
  );
}
