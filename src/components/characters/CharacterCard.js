import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/my-content/PreviewCard.module.css';

export default function CharacterCard({ character }) {
  const profile = character.profile || character;
  const traits = (profile.traits || []).slice(0, 2).join(' · ');

  return (
    <Link href={`/characters/${character.id}`} className={styles.card} aria-label={profile.name}>
      {character.portrait_url && <Image src={character.portrait_url} alt="" fill sizes="148px" className={styles.image} />}
      <span className={styles.overlay} aria-hidden="true" />
      <span className={styles.label}>{profile.name}<br /><small>{profile.character_type}{traits ? ` · ${traits}` : ''}</small></span>
    </Link>
  );
}
