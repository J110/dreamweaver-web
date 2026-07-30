'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import { characterApi } from '@/utils/api';
import styles from './page.module.css';

export default function CharacterDetailPage({ params }) {
  const router = useRouter();
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?intent=${encodeURIComponent(`/characters/${params.id}`)}`);
      return;
    }
    getUser();
    characterApi.get(params.id).then(setCharacter).catch((requestError) => {
      setError(requestError?.status === 404 ? 'Character not found.' : 'Unable to load this character.');
    });
  }, [params.id, router]);

  const remove = async () => {
    setDeleting(true);
    try {
      await characterApi.remove(params.id);
      router.replace('/my-stories');
    } catch {
      setError('Unable to delete this character.');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <main className={styles.page}><p role="alert">{error}</p></main>;
  if (!character) return <main className={styles.page} aria-live="polite"><p>Loading character…</p></main>;
  const profile = character.profile || character;

  return <main className={styles.page}><article className={styles.card}>
    {character.portrait_url && <img className={styles.portrait} src={character.portrait_url} alt="" />}
    <h1>{profile.name}</h1>
    <p>{profile.profile_summary}</p>
    <p>{profile.character_type} · {(profile.traits || []).join(' · ')}</p>
    <div className={styles.actions}>
      <Link href={`/characters/${params.id}/edit`}>Edit</Link>
      <button type="button" onClick={() => setConfirming(true)}>Delete Character</button>
    </div>
    {confirming && <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Delete character">
      <p>Delete {profile.name}? This cannot be undone.</p>
      <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>Cancel</button>
      <button type="button" onClick={remove} disabled={deleting}>Delete</button>
    </div>}
  </article></main>;
}
