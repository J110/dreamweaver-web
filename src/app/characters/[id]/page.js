'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import { characterApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

export default function CharacterDetailPage({ params }) {
  const router = useRouter();
  const { t } = useI18n();
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const trigger = useRef(null);
  const dialog = useRef(null);
  const cancel = useRef(null);

  useEffect(() => {
    if (!confirming) return undefined;
    (deleting ? dialog.current : cancel.current)?.focus();
    return () => trigger.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?intent=${encodeURIComponent(`/characters/${params.id}`)}`);
      return;
    }
    getUser();
    characterApi.get(params.id).then(setCharacter).catch((requestError) => {
      setError(requestError?.status === 404 ? t('characterNotFound') : t('characterLoadFailed'));
    });
  }, [params.id, router]);

  const remove = async () => {
    setDeleting(true);
    try {
      await characterApi.remove(params.id);
      router.replace('/my-stories');
    } catch {
      setDeleteError(t('characterDeleteFailed'));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <main className={styles.page}><p role="alert">{error}</p></main>;
  if (!character) return <main className={styles.page} aria-live="polite"><p>{t('characterLoading')}</p></main>;
  const profile = character.profile || character;

  return <main className={styles.page}><article className={styles.card}>
    {character.portrait_url && <img className={styles.portrait} src={character.portrait_url} alt="" />}
    <h1>{profile.name}</h1>
    <p>{profile.profile_summary}</p>
    <p>{t(`characterType${profile.character_type?.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`)} · {(profile.traits || []).map((trait) => t(`characterTrait${trait.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`)).join(' · ')}</p>
    <div className={styles.actions}>
      <Link href={`/characters/${params.id}/edit`}>{t('characterEdit')}</Link>
      <button ref={trigger} type="button" onClick={() => setConfirming(true)}>{t('characterDeleteCharacter')}</button>
    </div>
    {deleteError && <p role="alert">{deleteError}</p>}
    {confirming && <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-label={t('characterDeleteCharacter')} onKeyDown={(event) => {
      if (event.key === 'Escape' && !deleting) { event.preventDefault(); setConfirming(false); }
      if (event.key === 'Tab') { const buttons = dialog.current?.querySelectorAll('button:not([disabled])') || []; if (!buttons.length) { event.preventDefault(); dialog.current?.focus(); return; } const first = buttons[0]; const last = buttons[buttons.length - 1]; if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); } }
    }} tabIndex={-1}>
      <p>{t('characterDeletePrompt').replace('{name}', profile.name)}</p>
      <button ref={cancel} type="button" onClick={() => setConfirming(false)} disabled={deleting}>{t('characterCancel')}</button>
      <button type="button" onClick={remove} disabled={deleting}>{t('characterDelete')}</button>
    </div>}
  </article></main>;
}
