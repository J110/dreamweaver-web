'use client';

export default function PaidGenerationDialog({ quote, onConfirm, onCancel, confirming, title, confirmLabel, cancelLabel }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="paid-generation-title">
      <h2 id="paid-generation-title">{title}</h2>
      <p>{quote.credit_cost} credits. {quote.credits_after} credits remaining.</p>
      <button type="button" onClick={onCancel} disabled={confirming}>{cancelLabel}</button>
      <button type="button" onClick={onConfirm} disabled={confirming}>{confirmLabel}</button>
    </div>
  );
}
