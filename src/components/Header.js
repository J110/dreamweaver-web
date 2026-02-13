'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, logout as logoutUser, isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
  const { lang } = useI18n();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const logoSrc = lang === 'hi' ? '/logo-hi.svg' : '/logo-new.svg';
  const appName = lang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley';

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setIsOpen(false);
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className="container flex flex-between">
        <Link href="/" className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={appName} className={styles.logoImage} />
          <span className={styles.logoText}>{appName}</span>
        </Link>

        <nav className={`${styles.nav} ${isOpen ? styles.navOpen : ''}`}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/explore" className={styles.navLink}>
            Explore
          </Link>
          <Link href="/my-stories" className={styles.navLink}>
            My Stories
          </Link>
        </nav>

        <div className={styles.actions}>
          {user ? (
            <div className={styles.userMenu}>
              <div className={styles.userGreeting}>
                <span className={styles.userName}>{user.username}</span>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={styles.menuToggle}
                  aria-label="Toggle menu"
                >
                  ⋮
                </button>
              </div>
              {isOpen && (
                <div className={styles.dropdown}>
                  <button
                    onClick={handleLogout}
                    className={styles.dropdownItem}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
}
