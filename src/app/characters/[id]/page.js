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
  }, [confirming, deleting]);

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

  if (error) return <main className={styles.page}><button type="button" className={styles.backButton} onClick={() => router.push('/my-stories')}>← {t('characterBack')}</button><p role="alert">{error}</p></main>;
  if (!character) return <main className={styles.page} aria-live="polite"><button type="button" className={styles.backButton} onClick={() => router.push('/my-stories')}>← {t('characterBack')}</button><p>{t('characterLoading')}</p></main>;
  const profile = character.profile || character;
  const characterId = character.id || params.id;
  const type = t(`characterType${profile.character_type?.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`);
  const traits = (profile.traits || []).map((trait) => t(`characterTrait${trait.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`));

  return <main className={styles.page}><div className={styles.shell}>
    <button type="button" className={styles.backButton} onClick={() => router.push('/my-stories')}>← {t('characterBack')}</button>
    <article className={styles.card}>
    <header className={styles.hero}><span>Dream Valley</span><strong>{t('myCharacters')}</strong></header>
    {character.portrait_url && <div className={styles.portraitFrame}><img className={styles.portrait} src={character.portrait_url} alt="" /></div>}
    <div className={styles.details}>
    <h1>{profile.name}</h1>
    <p className={styles.summary}>{profile.profile_summary}</p>
    <div className={styles.chips}><span>{type}</span>{traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
    <div className={styles.actions}>
      <Link className={styles.editButton} href={`/characters/${characterId}/edit`}>{t('characterEdit')}</Link>
      <button className={styles.deleteButton} ref={trigger} type="button" onClick={() => setConfirming(true)}>{t('characterDeleteCharacter')}</button>
    </div>
    {deleteError && <p role="alert">{deleteError}</p>}
    </div>
    {confirming && <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-label={t('characterDeleteCharacter')} onKeyDown={(event) => {
      if (event.key === 'Escape' && !deleting) { event.preventDefault(); setConfirming(false); }
      if (event.key === 'Tab') { const buttons = dialog.current?.querySelectorAll('button:not([disabled])') || []; if (!buttons.length) { event.preventDefault(); dialog.current?.focus(); return; } const first = buttons[0]; const last = buttons[buttons.length - 1]; if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); } }
    }} tabIndex={-1}>
      <p>{t('characterDeletePrompt').replace('{name}', profile.name)}</p>
      <button ref={cancel} type="button" onClick={() => setConfirming(false)} disabled={deleting}>{t('characterCancel')}</button>
      <button type="button" onClick={remove} disabled={deleting}>{t('characterDelete')}</button>
    </div>}
  </article></div></main>;
}
