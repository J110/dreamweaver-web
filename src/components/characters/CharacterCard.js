import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/my-content/PreviewCard.module.css';
import { useI18n } from '@/utils/i18n';

const labelFor = (value, prefix, t) => t(`${prefix}${String(value || '').split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`);

export default function CharacterCard({ character }) {
  const profile = character.profile || character;
  const { t } = useI18n();
  const traits = (profile.traits || []).slice(0, 2).map((trait) => labelFor(trait, 'characterTrait', t)).join(' · ');

  return (
    <Link href={`/characters/${character.id}`} className={styles.card} aria-label={profile.name}>
      {character.portrait_url && <Image src={character.portrait_url} alt="" fill sizes="148px" className={styles.image} />}
      <span className={styles.overlay} aria-hidden="true" />
      <span className={styles.label}>{profile.name}<br /><small>{labelFor(profile.character_type, 'characterType', t)}{traits ? ` · ${traits}` : ''}</small></span>
    </Link>
  );
}
