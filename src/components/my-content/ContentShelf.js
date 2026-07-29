import styles from './ContentShelf.module.css';

export default function ContentShelf({
  title,
  children,
  emptyMessage,
  exploreLabel,
  onExplore,
}) {
  const headingId = `shelf-${title.toLowerCase()}`;

  return (
    <section className={styles.shelf} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>{title}</h2>
      <div className={styles.track}>{children}</div>
      {emptyMessage && (
        <div className={styles.empty}>
          <span>{emptyMessage}</span>
          {onExplore && <button type="button" onClick={onExplore}>{exploreLabel}</button>}
        </div>
      )}
    </section>
  );
}
