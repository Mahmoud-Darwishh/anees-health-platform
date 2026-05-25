'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';

const Header = () => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [searchField, setSearchField] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLLIElement>(null);
  const toggleSearch = () => {
    setSearchField(!searchField);
  };
  const [headerClass, setHeaderClass] = useState(
    "header header-custom header-fixed inner-header relative"
  );
  
  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    // Exact match for home page
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    
    // For hash links, only highlight when on home page AND hash matches current URL hash
    if (href.includes('#')) {
      // Don't mark hash links as active - they're anchor links, not separate pages
      return false;
    }
    
    // For regular routes like /doctors
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
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
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
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const onHandleMobileMenu = () => {
    const root = document.getElementsByTagName("html")[0];
    root.classList.add("menu-opened");
  };
  const onHandleCloseMenu = () => {
    const root = document.getElementsByTagName("html")[0];
    root.classList.remove("menu-opened");
    setOpenSubmenus({});
  };
  const onHandleLinkClick = () => {
    onHandleCloseMenu();
    setUserMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the mobile drawer on Escape + on route change (pathname/locale).
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onHandleCloseMenu();
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    onHandleCloseMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale]);

  // Toggle submenu on mobile (click/touch) while preserving hover on desktop
  const handleSubmenuToggle = (
    e: React.MouseEvent | React.KeyboardEvent | React.TouchEvent,
    key: string
  ) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 992;
    if (!isMobile) return; // let hover handle desktop/tablet

    e.preventDefault();
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div>
      <>
        <header className={headerClass}>
          <div className="container">
            <nav className="navbar navbar-expand-lg header-nav">
              <div className="navbar-header">
                <Link id="mobile_btn" href="#" onClick={onHandleMobileMenu} aria-label="Open menu">
                  <span className="bar-icon">
                    <span />
                    <span />
                    <span />
                  </span>
                </Link>
                <Link
                  href={`/${locale}`}
                  className="navbar-brand logo"
                >
                  <img
                    src="/assets/img/anees-logo.png"
                    className="img-fluid"
                    alt={t('header.title')}
                  />
                </Link>
              </div>
              <div className="header-menu">
                <div className="main-menu-wrapper">
                  <div className="menu-header">
                    <Link href={`/${locale}`} className="menu-logo" onClick={onHandleLinkClick}>
                      <img
                        src="/assets/img/anees-logo.png"
                        className="img-fluid"
                        alt={t('header.title')}
                      />
                    </Link>
                    <Link
                      id="menu_close"
                      className="menu-close"
                      href="#"
                      onClick={onHandleCloseMenu}
                      aria-label="Close menu"
                    >
                      <i className="fas fa-times" />
                    </Link>
                  </div>
                  <ul className="main-nav d-flex">
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}`) ? 'active' : ''}`}>
                      <Link href={`/${locale}`} className="nav-link" onClick={onHandleLinkClick}>
                        {t('nav.home')}
                      </Link>
                    </li>
                    
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}/about-us`) ? 'active' : ''}`}>
                      <Link href={`/${locale}/about-us`} className="nav-link" onClick={onHandleLinkClick}>
                        {t('nav.about_us')}
                      </Link>
                    </li>
                    
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}/doctors`) ? 'active' : ''}`}>
                      <Link href={`/${locale}/doctors`} className="nav-link" onClick={onHandleLinkClick}>
                        {t('nav.doctors')}
                      </Link>
                    </li>
                    
                    <li
                      className={`nav-item has-submenu me-3 ${
                        isActiveLink(`/${locale}#services`) || isActiveLink(`/${locale}/coverage`) ? 'active' : ''
                      } ${openSubmenus.services ? 'active submenu-open' : ''}`}
                    >
                      <Link
                        href={`/${locale}#services`}
                        className="nav-link"
                        onClick={(e) => handleSubmenuToggle(e, 'services')}
                        role="button"
                        aria-haspopup="true"
                        aria-expanded={openSubmenus.services ? 'true' : 'false'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSubmenuToggle(e, 'services');
                          }
                        }}
                      >
                        {t('nav.services')} <i className="fas fa-chevron-down ms-1"></i>
                      </Link>
                      <ul
                        className={`submenu ${openSubmenus.services ? 'submenu-open' : ''}`}
                      >
                        <li>
                          <Link href={`/${locale}/coverage`} onClick={onHandleLinkClick}>
                            {t('nav.coverage')}
                          </Link>
                        </li>
                        <li>
                          <Link href={`/${locale}/booking`} onClick={onHandleLinkClick}>
                            Book Now
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item me-3 d-lg-none mobile-lang-switcher">
                      <Link
                        href={`/${locale === 'en' ? 'ar' : 'en'}${pathname.replace(`/${locale}`, '')}`}
                        className="nav-link d-flex align-items-center"
                        onClick={onHandleLinkClick}
                      >
                        <i className="feather-globe me-2" />
                        <span>{locale === 'en' ? 'العربية' : 'English'}</span>
                      </Link>
                    </li>
                    {status !== 'loading' && session && (
                      <>
                        <li className="nav-item me-3 d-lg-none">
                          <Link href={`/${locale}/portal`} className="nav-link" onClick={onHandleLinkClick}>
                            <i className="feather-layout me-2" />{t('header.myPortal')}
                          </Link>
                        </li>
                        <li className="nav-item me-3 d-lg-none">
                          <button
                            type="button"
                            className="nav-link btn btn-link text-danger p-0 border-0 bg-transparent"
                            onClick={() => { onHandleCloseMenu(); signOut({ callbackUrl: `/${locale}` }); }}
                          >
                            <i className="feather-log-out me-2" />{t('auth.signout')}
                          </button>
                        </li>
                      </>
                    )}
                    {status !== 'loading' && !session && (
                      <li className="nav-item me-3 d-lg-none">
                        <Link href={`/${locale}/auth/login`} className="nav-link" onClick={onHandleLinkClick}>
                          <i className="feather-user me-2" />{t('header.login')}
                        </Link>
                      </li>
                    )}

                    {/* Mobile-only CTA row pinned at the bottom of the drawer */}
                    <li className="nav-item mobile-cta-row d-lg-none">
                      <Link
                        href={`/${locale}/booking`}
                        className="btn-primary-gradient"
                        onClick={onHandleLinkClick}
                      >
                        <i className="isax isax-calendar-1" />
                        <span>{t('header.bookNow')}</span>
                      </Link>
                      <Link
                        href={`/${locale}/coverage`}
                        className="btn-outline-brand"
                        onClick={onHandleLinkClick}
                      >
                        <i className="feather-map-pin" />
                        <span>{t('nav.coverage')}</span>
                      </Link>
                    </li>
                  </ul>
                </div>
                <ul className="nav header-navbar-rht">
                  <li className="searchbar">
                    <Link href="#" onClick={toggleSearch} aria-label={t('common.search')}>
                      <i className="feather-search" />
                    </Link>
                    <div
                      className={
                        searchField
                          ? "togglesearch d-block"
                          : "togglesearch d-none"
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
                          <button
                            type="submit"
                            className="btn"
                          >
                            {t('common.search')}
                          </button>
                        </div>
                      </form>
                    </div>
                  </li>

                  <li className="nav-item me-2">
                    <Link 
                      href={`/${locale === 'en' ? 'ar' : 'en'}${pathname.replace(`/${locale}`, '')}`}
                      className="nav-link"
                    >
                      <i className="feather-globe me-2" />
                      <span>{locale === 'en' ? 'العربية' : 'English'}</span>
                    </Link>
                  </li>

                  {status !== 'loading' && (
                    session ? (
                      <li className="nav-item me-2 position-relative" ref={userMenuRef}>
                        <button
                          type="button"
                          className="btn btn-md d-flex align-items-center rounded-pill"
                          style={{ border: '1.5px solid #aa8642', color: '#aa8642', background: 'transparent', transition: 'all 0.18s', gap: '0.3rem' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#aa8642'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#aa8642'; }}
                          onClick={() => setUserMenuOpen(v => !v)}
                          aria-expanded={userMenuOpen}
                        >
                          <i className="feather-user" />
                          <span className="d-none d-xl-inline">
                            {session.user.name?.split(' ').slice(0, 2).join(' ') || t('header.myPortal')}
                          </span>
                          <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }} />
                        </button>
                        {userMenuOpen && (
                          <ul
                            className="dropdown-menu show"
                            style={{ right: 0, left: 'auto', minWidth: '170px', top: '110%' }}
                          >
                            <li>
                              <Link
                                className="dropdown-item"
                                href={`/${locale}/portal`}
                                onClick={() => { setUserMenuOpen(false); onHandleLinkClick(); }}
                              >
                                <i className="feather-layout me-2" />{t('header.myPortal')}
                              </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                type="button"
                                className="dropdown-item text-danger"
                                onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: `/${locale}` }); }}
                              >
                                <i className="feather-log-out me-2" />{t('auth.signout')}
                              </button>
                            </li>
                          </ul>
                        )}
                      </li>
                    ) : (
                      <li className="nav-item me-2">
                        <Link
                          href={`/${locale}/auth/login`}
                          className="btn btn-md d-flex align-items-center rounded-pill"
                          style={{ border: '1.5px solid #aa8642', color: '#aa8642', background: 'transparent', gap: '0.3rem' }}
                          onClick={onHandleLinkClick}
                        >
                          <i className="feather-user" />
                          <span>{t('header.login')}</span>
                        </Link>
                      </li>
                    )
                  )}

                  <li className="nav-item me-2">
                    <Link
                      href={`/${locale}/booking`}
                      className="btn btn-md btn-primary-gradient d-flex align-items-center rounded-pill"
                      onClick={onHandleLinkClick}
                    >
                      <i className="isax isax-calendar-1 me-2" />
                      <span>{t('header.bookNow')}</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </header>
        {/* Mobile drawer backdrop — visibility controlled by `html.menu-opened` */}
        <div
          className="mobile-menu-backdrop"
          onClick={onHandleCloseMenu}
          aria-hidden="true"
        />
      </>
    </div>
  );
};

export default Header;


