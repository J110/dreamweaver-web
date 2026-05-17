'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/utils/i18n';
import { isLoggedIn } from '@/utils/auth';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isLoggedIn());
  }, [pathname]);

  const beforeBedLabel = t('navBeforeBed');
  const homeLabel = t('navHome');

  const authedTabs = [
    { href: '/', label: homeLabel, icon: '🏠', activeIcon: '🏠' },
    { href: '/before-bed', label: beforeBedLabel, icon: '🌙', activeIcon: '🌙' },
    { href: '/my-stories', label: t('navMyStories'), icon: '📚', activeIcon: '📚', showLive: true },
    { href: '/profile', label: t('navProfile'), icon: '👤', activeIcon: '👤' },
  ];

  const anonTabs = [
    { href: '/', label: homeLabel, icon: '🏠', activeIcon: '🏠' },
    { href: '/before-bed', label: beforeBedLabel, icon: '🌙', activeIcon: '🌙' },
    { href: '/login', label: lang === 'hi' ? 'Sign in' : 'Sign in', icon: '👤', activeIcon: '👤' },
  ];

  const tabs = authed ? authedTabs : anonTabs;

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
            {tab.showLive && <span className={styles.liveDot} aria-label="Live" />}
            {isActive && <div className={styles.indicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
