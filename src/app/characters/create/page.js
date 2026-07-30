'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import CharacterWizard from '@/components/characters/CharacterWizard';
import styles from './page.module.css';

export default function CreateCharacterPage() {
  const router = useRouter();
  const signedIn = isLoggedIn();
  const user = getUser();

  useEffect(() => {
    if (!signedIn) router.replace('/login?intent=%2Fcharacters%2Fcreate');
  }, [router, signedIn]);

  if (!signedIn) return null;
  return <main className={styles.page}><div className={styles.card}><CharacterWizard uid={user?.uid || user?.id} onDone={() => router.push('/my-stories')} onEdit={(id) => router.push(`/characters/${id}/edit`)} /></div></main>;
}
