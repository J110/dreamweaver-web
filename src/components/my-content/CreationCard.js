import styles from './PreviewCard.module.css';

export default function CreationCard({ icon, label, onActivate }) {
  return (
    <button type="button" className={`${styles.card} ${styles.creationCard}`} onClick={onActivate}>
      <span className={styles.creationIcon} aria-hidden="true">{icon}</span>
      <span className={styles.label}>{label}</span>
      <small>Coming soon</small>
    </button>
  );
}
