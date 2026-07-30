'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import CharacterWizard from '@/components/characters/CharacterWizard';
import styles from './page.module.css';

export default function CreateCharacterPage() {
  const router = useRouter();
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
  return <main className={styles.page}><div className={styles.card}><CharacterWizard uid={auth.user.uid || auth.user.id} onDone={() => router.push('/my-stories')} onEdit={(id) => router.push(`/characters/${id}/edit`)} /></div></main>;
}
