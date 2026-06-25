'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import LucideIcon from '@/components/common/LucideIcon';

const Header = () => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [searchField, setSearchField] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const userMenuRef = useRef<HTMLLIElement>(null);
  const toggleSearch = () => setSearchField((v) => !v);

  const auditedSignOut = async () => {
    try {
      await fetch('/api/auth/logout-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    } catch {
      // Best-effort only; auth sign-out should proceed even if audit write fails.
    }

    await signOut({ callbackUrl: `/${locale}` });
  };

  const [headerClass, setHeaderClass] = useState(
    "header header-custom header-fixed inner-header relative"
  );

  const isActiveLink = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    if (href.includes('#')) return false;
    if (href.startsWith(`/${locale}/`)) {
      return pathname.startsWith(href);
    }
    return false;
  };

  const directionPath = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeSearchQuery.trim()) {
      router.push(`/${locale}/doctors?search=${encodeURIComponent(homeSearchQuery)}`);
      setHomeSearchQuery('');
      setSearchField(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 100) {
        setHeaderClass(
          "header header-custom header-fixed inner-header relative fixed pharmacy-header"
        );
      } else {
        setHeaderClass(
          "header header-custom header-fixed inner-header relative"
        );
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── Mobile drawer controls ─────────────────────────────────────────
  const onHandleMobileMenu = () => {
    document.documentElement.classList.add('menu-opened');
  };
  const onHandleCloseMenu = () => {
    document.documentElement.classList.remove('menu-opened');
    setOpenSubmenus({});
  };
  const onHandleLinkClick = () => {
    onHandleCloseMenu();
    setUserMenuOpen(false);
    setSearchField(false);
  };

  const toggleSubmenu = (e: React.MouseEvent | React.KeyboardEvent, key: string) => {
    // Only intercept on mobile widths (where the drawer is in use)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 992;
    if (!isMobile) return;
    e.preventDefault();
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape closes everything
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onHandleCloseMenu();
        setUserMenuOpen(false);
        setSearchField(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close everything on route change
  useEffect(() => {
    queueMicrotask(() => {
      onHandleCloseMenu();
      setUserMenuOpen(false);
      setSearchField(false);
    });
  }, [pathname, locale]);

  const altLocale = locale === 'en' ? 'ar' : 'en';
  const altLocaleLabel = locale === 'en' ? 'العربية' : 'English';
  const altLocalePath = `/${altLocale}${pathname.replace(`/${locale}`, '')}`;

  return (
    <>
      <header className={headerClass}>
        <div className="container">
          <nav className="navbar navbar-expand-lg header-nav">
            {/* ─── Brand + burger (mobile) ────────────────────── */}
            <div className="navbar-header">
              <button
                type="button"
                id="mobile_btn"
                className="header-burger"
                onClick={onHandleMobileMenu}
                aria-label="Open menu"
                aria-controls="mobile-drawer"
                aria-expanded="false"
              >
                <span className="header-burger__icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              <Link href={`/${locale}`} className="navbar-brand logo" aria-label={t('header.title')}>
                <img
                  src="/assets/img/anees-logo.png"
                  alt={t('header.title')}
                />
              </Link>
            </div>

            {/* ─── Center nav (desktop) ───────────────────────── */}
            <div className="header-menu">
              <ul className="main-nav">
                <li className={`nav-item ${isActiveLink(`/${locale}`) ? 'active' : ''}`}>
                  <Link href={`/${locale}`} className="nav-link" onClick={onHandleLinkClick}>
                    {t('nav.home')}
                  </Link>
                </li>

                <li className={`nav-item ${isActiveLink(`/${locale}/about-us`) ? 'active' : ''}`}>
                  <Link href={`/${locale}/about-us`} className="nav-link" onClick={onHandleLinkClick}>
                    {t('nav.about_us')}
                  </Link>
                </li>

                <li className={`nav-item ${isActiveLink(`/${locale}/doctors`) ? 'active' : ''}`}>
                  <Link href={`/${locale}/doctors`} className="nav-link" onClick={onHandleLinkClick}>
                    {t('nav.doctors')}
                  </Link>
                </li>

                <li
                  className={`nav-item has-submenu ${
                    isActiveLink(`/${locale}/services`) ||
                    isActiveLink(`/${locale}/specialties`) ||
                    isActiveLink(`/${locale}/coverage`)
                      ? 'active'
                      : ''
                  }`}
                >
                  <Link
                    href={`/${locale}/services`}
                    className="nav-link"
                    role="button"
                    aria-haspopup="true"
                  >
                    {t('nav.services')} <LucideIcon iconClass="fas fa-chevron-down" />
                  </Link>
                  <ul className="submenu">
                    <li>
                      <Link href={`/${locale}/services`} onClick={onHandleLinkClick}>
                        {t('footer.our_services')}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/specialties`} onClick={onHandleLinkClick}>
                        {t('footer.specialities')}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/coverage`} onClick={onHandleLinkClick}>
                        {t('nav.coverage')}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/booking`} onClick={onHandleLinkClick}>
                        {t('header.bookNow')}
                      </Link>
                    </li>
                  </ul>
                </li>

                <li className={`nav-item ${isActiveLink(`/${locale}/contact-us`) ? 'active' : ''}`}>
                  <Link href={`/${locale}/contact-us`} className="nav-link" onClick={onHandleLinkClick}>
                    {t('nav.contact_us')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* ─── Right-side actions ─────────────────────────── */}
            <ul className="nav header-navbar-rht">
              {/* Search — desktop only */}
              <li className="searchbar nav-item">
                <button
                  type="button"
                  className="header-icon-btn"
                  onClick={toggleSearch}
                  aria-label={t('common.search')}
                  aria-expanded={searchField}
                >
                  <LucideIcon iconClass="fa-solid fa-magnifying-glass" />
                </button>
                <div
                  className={
                    searchField ? "togglesearch d-block" : "togglesearch d-none"
                  }
                >
                  <form onSubmit={directionPath}>
                    <div className="input-group">
                      <input
                        type="text"
                        id="header-search"
                        name="search"
                        className="form-control"
                        placeholder={t('header.search_placeholder')}
                        value={homeSearchQuery}
                        onChange={(e) => setHomeSearchQuery(e.target.value)}
                        autoComplete="off"
                      />
                      <button type="submit" className="btn">
                        {t('common.search')}
                      </button>
                    </div>
                  </form>
                </div>
              </li>

              {/* Language switcher — baby-blue contrast */}
              <li className="nav-item">
                <Link
                  href={altLocalePath}
                  className="header-lang-btn"
                  aria-label={altLocaleLabel}
                  onClick={onHandleLinkClick}
                >
                  <LucideIcon iconClass="fa-solid fa-globe" />
                  <span className="header-lang-btn__label">{altLocaleLabel}</span>
                </Link>
              </li>

              {/* Auth */}
              {status !== 'loading' && (
                session ? (
                  <li className="nav-item position-relative header-user-pill-wrapper" ref={userMenuRef}>
                    <button
                      type="button"
                      className="header-user-pill"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      aria-expanded={userMenuOpen}
                      aria-label={t('header.myPortal')}
                    >
                      <LucideIcon iconClass="fa-solid fa-user" />
                      <span className="header-user-pill__name">
                        {session.user.name?.split(' ').slice(0, 2).join(' ') || t('header.myPortal')}
                      </span>
                      <LucideIcon iconClass="fas fa-chevron-down header-user-pill__caret" />
                    </button>
                    {userMenuOpen && (
                      <ul className="dropdown-menu show header-user-menu">
                        {session.user.role === 'patient' && (
                          <li>
                            <Link
                              href={`/${locale}/portal`}
                              className="dropdown-item"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <LucideIcon iconClass="fa-solid fa-user-doctor me-2" />{t('header.myPortal')}
                            </Link>
                          </li>
                        )}
                        {session.user.role === 'staff' && (
                          <li>
                            <Link
                              href="/admin/patients"
                              className="dropdown-item"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <LucideIcon iconClass="fa-solid fa-shield-halved me-2" />{t('header.admin')}
                            </Link>
                          </li>
                        )}
                        <li>
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => { setUserMenuOpen(false); void auditedSignOut(); }}
                          >
                            <LucideIcon iconClass="fa-solid fa-right-from-bracket me-2" />{t('auth.signout')}
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>
                ) : (
                  <li className="nav-item">
                    <Link
                      href={`/${locale}/auth/login`}
                      className="header-login-pill"
                      onClick={onHandleLinkClick}
                      aria-label={t('header.login')}
                    >
                      <LucideIcon iconClass="fa-solid fa-user" />
                      <span className="header-login-pill__label">{t('header.login')}</span>
                    </Link>
                  </li>
                )
              )}

              {/* Booking CTA */}
              <li className="nav-item">
                <Link
                  href={`/${locale}/booking`}
                  className="btn btn-primary-gradient header-book-cta"
                  onClick={onHandleLinkClick}
                  aria-label={t('header.bookNow')}
                >
                  <LucideIcon iconClass="fa-solid fa-calendar-days" />
                  <span className="header-book-cta__label">{t('header.bookNow')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE DRAWER + BACKDROP
          ═══════════════════════════════════════════════════════════════ */}
      <div
        className="mobile-menu-backdrop"
        onClick={onHandleCloseMenu}
        aria-hidden="true"
      />
      <aside
        id="mobile-drawer"
        className="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="mobile-drawer__header">
          <Link
            href={`/${locale}`}
            className="mobile-drawer__logo"
            onClick={onHandleLinkClick}
            aria-label={t('header.title')}
          >
            <img src="/assets/img/anees-logo.png" alt={t('header.title')} />
          </Link>
          <button
            type="button"
            className="mobile-drawer__close"
            onClick={onHandleCloseMenu}
            aria-label="Close menu"
          >
            <LucideIcon iconClass="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        <nav className="mobile-drawer__body" aria-label="Mobile navigation">
          <ul className="mobile-drawer__nav">
            <li className={isActiveLink(`/${locale}`) ? 'active' : ''}>
              <Link href={`/${locale}`} onClick={onHandleLinkClick}>
                <LucideIcon iconClass="fa-solid fa-house" />
                <span>{t('nav.home')}</span>
              </Link>
            </li>
            <li className={isActiveLink(`/${locale}/about-us`) ? 'active' : ''}>
              <Link href={`/${locale}/about-us`} onClick={onHandleLinkClick}>
                <LucideIcon iconClass="fa-solid fa-circle-info" />
                <span>{t('nav.about_us')}</span>
              </Link>
            </li>
            <li className={isActiveLink(`/${locale}/doctors`) ? 'active' : ''}>
              <Link href={`/${locale}/doctors`} onClick={onHandleLinkClick}>
                <LucideIcon iconClass="fa-solid fa-users" />
                <span>{t('nav.doctors')}</span>
              </Link>
            </li>

            {/* Services group with collapsible submenu */}
            <li
              className={`has-submenu ${openSubmenus.services ? 'submenu-open' : ''} ${
                isActiveLink(`/${locale}/services`) ||
                isActiveLink(`/${locale}/specialties`) ||
                isActiveLink(`/${locale}/coverage`)
                  ? 'active'
                  : ''
              }`}
            >
              <button
                type="button"
                className="mobile-drawer__group-toggle"
                onClick={(e) => toggleSubmenu(e, 'services')}
                aria-expanded={!!openSubmenus.services}
              >
                <LucideIcon iconClass="fa-solid fa-grip" />
                <span>{t('nav.services')}</span>
                <LucideIcon iconClass="fas fa-chevron-down mobile-drawer__chevron" aria-hidden="true" />
              </button>
              <ul className="mobile-drawer__submenu">
                <li>
                  <Link href={`/${locale}/services`} onClick={onHandleLinkClick}>
                    <LucideIcon iconClass="fa-solid fa-heart-pulse" />
                    <span>{t('footer.our_services')}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/specialties`} onClick={onHandleLinkClick}>
                    <LucideIcon iconClass="fa-solid fa-layer-group" />
                    <span>{t('footer.specialities')}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/coverage`} onClick={onHandleLinkClick}>
                    <LucideIcon iconClass="fa-solid fa-location-dot" />
                    <span>{t('nav.coverage')}</span>
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/booking`} onClick={onHandleLinkClick}>
                    <LucideIcon iconClass="fa-solid fa-calendar-days" />
                    <span>{t('header.bookNow')}</span>
                  </Link>
                </li>
              </ul>
            </li>

            <li className={isActiveLink(`/${locale}/contact-us`) ? 'active' : ''}>
              <Link href={`/${locale}/contact-us`} onClick={onHandleLinkClick}>
                <LucideIcon iconClass="fa-solid fa-phone" />
                <span>{t('nav.contact_us')}</span>
              </Link>
            </li>
          </ul>

          <div className="mobile-drawer__divider" />

          <ul className="mobile-drawer__secondary">
            <li>
              <Link
                href={altLocalePath}
                className="mobile-drawer__lang"
                onClick={onHandleLinkClick}
              >
                <LucideIcon iconClass="fa-solid fa-globe" />
                <span>{altLocaleLabel}</span>
              </Link>
            </li>

            {status !== 'loading' && session && (
              <>
                <li>
                  <button
                    type="button"
                    className="mobile-drawer__signout"
                    onClick={() => { onHandleCloseMenu(); void auditedSignOut(); }}
                  >
                    <LucideIcon iconClass="fa-solid fa-right-from-bracket" />
                    <span>{t('auth.signout')}</span>
                  </button>
                </li>
              </>
            )}

            {status !== 'loading' && !session && (
              <li>
                <Link
                  href={`/${locale}/auth/login`}
                  className="mobile-drawer__login"
                  onClick={onHandleLinkClick}
                >
                  <LucideIcon iconClass="fa-solid fa-user" />
                  <span>{t('header.login')}</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="mobile-drawer__footer">
          <Link
            href={`/${locale}/booking`}
            className="mobile-drawer__cta-primary"
            onClick={onHandleLinkClick}
          >
            <LucideIcon iconClass="fa-solid fa-calendar-days" />
            <span>{t('header.bookNow')}</span>
          </Link>
          <Link
            href={`/${locale}/coverage`}
            className="mobile-drawer__cta-secondary"
            onClick={onHandleLinkClick}
          >
            <LucideIcon iconClass="fa-solid fa-location-dot" />
            <span>{t('nav.coverage')}</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Header;

