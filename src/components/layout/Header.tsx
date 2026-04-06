'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

const Header = () => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [searchField, setSearchField] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
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
    // Close menu when any navigation link is clicked
    onHandleCloseMenu();
  };

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
      </>
    </div>
  );
};

export default Header;


