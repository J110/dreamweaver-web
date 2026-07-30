'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import { characterApi } from '@/utils/api';
import CharacterWizard from '@/components/characters/CharacterWizard';

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
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?intent=${encodeURIComponent(`/characters/${params.id}/edit`)}`);
      return;
    }
    setUser(getUser());
    characterApi.get(params.id).then(setCharacter).catch(() => setError('Unable to load this character.'));
  }, [params.id, router]);

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!user || !character) return <main aria-live="polite"><p>Loading character…</p></main>;
  return <CharacterWizard uid={user.uid || user.id} mode="edit" targetCharacterId={params.id} initialInputs={inputsFor(character)} onDone={() => router.replace(`/characters/${params.id}`)} />;
}
