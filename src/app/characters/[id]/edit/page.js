'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import { characterApi } from '@/utils/api';
import CharacterWizard from '@/components/characters/CharacterWizard';
import styles from '../../create/page.module.css';
import { useI18n } from '@/utils/i18n';

const inputsFor = (character) => {
  const profile = character.profile || character;
  return {
    name: profile.name || '',
    characterType: profile.character_type || '',
    gender: profile.gender || 'not_specified',
    traits: profile.traits || [],
    customDescription: profile.custom_description || profile.profile_summary || '',
  };
};

export default function EditCharacterPage({ params }) {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const [wizardVersion, setWizardVersion] = useState(0);
  const [showWizardResult, setShowWizardResult] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?intent=${encodeURIComponent(`/characters/${params.id}/edit`)}`);
      return;
    }
    setUser(getUser());
    characterApi.get(params.id).then(setCharacter).catch(() => setError(t('characterLoadFailed')));
  }, [params.id, router]);

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!user || !character) return <main aria-live="polite"><p>{t('characterLoading')}</p></main>;
  const profile = character.profile || character;
  return <main className={styles.page}><div className={styles.card}>
    <button type="button" className={styles.backButton} onClick={() => router.push(`/characters/${params.id}`)}>← {t('characterBack')}</button>
    <header className={styles.hero} aria-label={t('characterEditTitle')}><span className={styles.heroMoon} aria-hidden="true" /><div><p className={styles.heroEyebrow}>Dream Valley</p><h2>{t('characterEditTitle')}</h2><p>{profile.name}</p></div></header>
    {!showWizardResult && <div className={styles.editIntro}>{character.portrait_url && <img className={styles.editPortrait} src={character.portrait_url} alt="" />}<div><strong>{profile.name}</strong><p>{profile.profile_summary}</p></div></div>}
    <CharacterWizard key={wizardVersion} uid={user.uid || user.id} mode="edit" targetCharacterId={params.id} initialInputs={inputsFor(character)} onResult={(saved) => { setCharacter(saved); setShowWizardResult(true); }} onDone={() => router.replace(`/characters/${params.id}`)} onEdit={() => { setShowWizardResult(false); setWizardVersion((version) => version + 1); }} onDelete={() => router.replace('/my-stories')} />
  </div></main>;
}
