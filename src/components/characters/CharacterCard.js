import Link from 'next/link';
import Image from 'next/image';
import styles from '@/components/my-content/PreviewCard.module.css';
import { useI18n } from '@/utils/i18n';

const labelFor = (value, prefix, t) => t(`${prefix}${String(value || '').split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}`);

export default function CharacterCard({ character }) {
  const profile = character.profile || character;
  const { t } = useI18n();
  const traits = (profile.traits || []).slice(0, 2).map((trait) => labelFor(trait, 'characterTrait', t));
  const type = labelFor(profile.character_type, 'characterType', t);

  return (
    <Link href={`/characters/${character.id}`} className={`${styles.card} ${styles.characterCard}`} aria-label={profile.name}>
      <span className={styles.characterArt}>
        {character.portrait_url && <Image src={character.portrait_url} alt="" fill sizes="148px" className={`${styles.image} ${styles.characterImage}`} />}
      </span>
      <span className={styles.characterMeta}>
        <strong className={styles.characterName}>{profile.name}</strong>
        <span className={styles.characterType}>{type}</span>
        {traits.length > 0 && <span className={styles.characterTraits}>{traits.map((trait) => <small key={trait}>{trait}</small>)}</span>}
      </span>
    </Link>
  );
}
