'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/utils/i18n';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const tabs = [
    { href: '/', label: t('navHome'), icon: '🏠', activeIcon: '🏠' },
    { href: '/before-bed', label: t('navBeforeBed'), icon: '🌙', activeIcon: '🌙' },
    { href: '/my-stories', label: t('navMyStories'), icon: '📚', activeIcon: '📚' },
    { href: '/profile', label: t('navProfile'), icon: '👤', activeIcon: '👤' },
  ];

  return (
    <nav className={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href ||
          (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <span className={styles.icon}>{isActive ? tab.activeIcon : tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
            {isActive && <div className={styles.indicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
