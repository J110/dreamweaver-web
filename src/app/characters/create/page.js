'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import CharacterWizard from '@/components/characters/CharacterWizard';
import styles from './page.module.css';
import { useI18n } from '@/utils/i18n';

export default function CreateCharacterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [auth, setAuth] = useState({ ready: false, user: null });

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login?intent=%2Fcharacters%2Fcreate');
      setAuth({ ready: true, user: null });
      return;
    }
    setAuth({ ready: true, user: getUser() });
  }, [router]);

  if (!auth.ready || !auth.user) return null;
  return <main className={styles.page}><div className={styles.card}><header className={styles.hero} aria-label={t('characterHeroLabel')}><span className={styles.heroMoon} aria-hidden="true" /><div><p className={styles.heroEyebrow}>Dream Valley</p><h2>{t('characterHeroTitle')}</h2><p>{t('characterHeroSubtitle')}</p></div></header><CharacterWizard uid={auth.user.uid || auth.user.id} onDone={() => router.push('/my-stories')} onEdit={(id) => router.push(`/characters/${id}/edit`)} /></div></main>;
}
