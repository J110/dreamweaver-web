'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { isLoggedIn, getUser, logout } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    setUser(getUser());
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
  };

  const appName = lang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley';

  if (!user) return null;

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('profileTitle')}</h1>
        </div>

        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {user.username?.charAt(0).toUpperCase() || '🌙'}
          </div>
          <h2 className={styles.username}>{user.username}</h2>
          <p className={styles.appLabel}>{appName}</p>
        </div>

        <div className={styles.settings}>
          {/* Language Selector */}
          <div className={styles.settingCard}>
            <div className={styles.settingLabel}>
              🌍 {t('profileLanguage')}
            </div>
            <div className={styles.langSwitch}>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`${styles.langBtn} ${lang === 'hi' ? styles.langBtnActive : ''}`}
              >
                Hindi
              </button>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            {t('profileLogout')}
          </button>
        </div>
      </div>
    </>
  );
}
