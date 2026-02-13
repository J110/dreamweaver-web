'use client';

import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner({ message = "Weaving your dream..." }) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}>
        <div className={styles.moon}></div>
        <div className={styles.star}></div>
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
