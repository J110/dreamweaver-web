import { Children, useId } from 'react';
import styles from './ContentShelf.module.css';

export default function ContentShelf({
  title,
  children,
  emptyMessage,
  exploreLabel,
  onExplore,
}) {
  const headingId = useId();

  return (
    <section className={styles.shelf} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>{title}</h2>
      <div className={styles.track}>
        {Children.map(children, (child) => (
          child === null ? null : <div className={styles.item}>{child}</div>
        ))}
      </div>
      {emptyMessage && (
        <div className={styles.empty}>
          <span>{emptyMessage}</span>
          {onExplore && <button type="button" onClick={onExplore}>{exploreLabel}</button>}
        </div>
      )}
    </section>
  );
}
