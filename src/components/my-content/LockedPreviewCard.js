import Image from 'next/image';
import styles from './PreviewCard.module.css';

export default function LockedPreviewCard({ imageSrc, label, lockedLabel, onActivate }) {
  return (
    <button
      type="button"
      className={`${styles.card} ${styles.lockedCard}`}
      aria-label={`${lockedLabel}: ${label}`}
      onClick={onActivate}
    >
      <Image src={imageSrc} alt="" fill sizes="148px" className={styles.image} />
      <span className={styles.overlay} aria-hidden="true" />
      <span className={styles.lockBadge} aria-hidden="true">{lockedLabel}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
