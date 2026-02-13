'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { setToken, setUser } from '@/utils/auth';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      let res;

      // Try signup first
      try {
        res = await fetch(`${API_URL}/api/v1/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: 'dreamvalley_default',
            child_age: 5,
          }),
        });
      } catch (e) { /* network error */ }

      if (res && res.ok) {
        const data = await res.json();
        if (data.data?.token) {
          setToken(data.data.token);
          setUser({ uid: data.data.uid, username: data.data.username, child_age: data.data.child_age });
          router.push('/');
          return;
        }
      }

      // If signup fails (user exists), try login
      try {
        res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password: 'dreamvalley_default' }),
        });
      } catch (e) { /* network error */ }

      if (res && res.ok) {
        const data = await res.json();
        if (data.data?.token) {
          setToken(data.data.token);
          setUser({ uid: data.data.uid, username: data.data.username, child_age: data.data.child_age });
          router.push('/');
          return;
        }
      }

      // Offline mode — create local user so app still works
      const localUser = { uid: `local_${Date.now()}`, username: username.trim(), child_age: 5 };
      setToken(`local_token_${Date.now()}`);
      setUser(localUser);
      router.push('/');
    } catch (err) {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StarField />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.iconLarge}>🌙</div>
          <h1 className={styles.title}>{t('loginTitle')}</h1>
          <p className={styles.subtitle}>{t('loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <input
              type="text"
              placeholder={t('loginPlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              autoFocus
              disabled={loading}
              maxLength={20}
            />

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className={styles.submitBtn}
            >
              {loading ? `✨ ${t('loginLoading')}` : `✨ ${t('loginButton')}`}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
