'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

const Header: React.FC = () => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [searchField, setSearchField] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
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
      const baseHref = href.split('#')[0];
      const hashPart = href.split('#')[1];
      const isOnBasePage = pathname === baseHref || pathname === `${baseHref}/`;
      
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
  };

  return (
    <div>
      <>
      {/*
        <div className="header-topbar">
          <div className="container">
            <div className="topbar-info">
              <div className="d-flex align-items-center gap-3 header-info">
                <p>
                  <i className="isax isax-message-text5 me-1" />
                  info@example.com
                </p>
                <p>
                  <i className="isax isax-call5 me-1" />
                  +1 66589 14556
                </p>
              </div>
              <ul>
                <li className="header-theme">
                  <DarkModeToggle />
                </li>
                <li className="d-inline-flex align-items-center drop-header">
                          <img
                            src="assets/img/flags/france-flag.svg"
                            className="me-2"
                            alt="flag"
                          />
                          FRA
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown dropdown-amt">
                    <Link
                      href="#"
                      className="dropdown-toggle"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      USD
                    </Link>
                    <ul className="dropdown-menu p-2 mt-2">
                      <li>
                        <Link className="dropdown-item rounded" href="#">
                          USD
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded" href="#">
                          YEN
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded" href="#">
                          EURO
                        </Link>
                      </li>
                    </ul>
                  </div>
                </li>
                <li className="social-header">
                  <div className="social-icon">
                    <Link href="#">
                      <i className="fa-brands fa-facebook" />
                    </Link>
                    <Link href="#">
                      <i className="fa-brands fa-x-twitter" />
                    </Link>
                    <Link href="#">
                      <i className="fa-brands fa-instagram" />
                    </Link>
                    <Link href="#">
                      <i className="fa-brands fa-linkedin" />
                    </Link>
                    <Link href="#">
                      <i className="fa-brands fa-pinterest" />
                    </Link>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>   */}


        <header className={headerClass}>
          <div className="container">
            <nav className="navbar navbar-expand-lg header-nav">
              <div className="navbar-header">
                <Link id="mobile_btn" href="#" onClick={onHandleMobileMenu}>
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
                    alt="Logo"
                  />
                </Link>
              </div>
              <div className="header-menu">
                <div className="main-menu-wrapper">
                  <div className="menu-header">
                    <Link href={`/${locale}`} className="menu-logo">
                      <img
                        src="/assets/img/anees-logo.png"
                        className="img-fluid"
                        alt="Logo"
                      />
                    </Link>
                    <Link
                      id="menu_close"
                      className="menu-close"
                      href="#"
                      onClick={onHandleCloseMenu}
                    >
                      <i className="fas fa-times" />
                    </Link>
                  </div>
                  <ul className="main-nav d-flex">
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}`) ? 'active' : ''}`}>
                      <Link href={`/${locale}`} className="nav-link">
                        {t('nav.home')}
                      </Link>
                    </li>
                    
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}/about-us`) ? 'active' : ''}`}>
                      <Link href={`/${locale}/about-us`} className="nav-link">
                        {t('nav.about_us')}
                      </Link>
                    </li>
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}#services`) ? 'active' : ''}`}>
                      <Link href={`/${locale}#services`} className="nav-link">
                        {t('nav.services')}
                      </Link>
                    </li>
                    <li className={`nav-item me-3 ${isActiveLink(`/${locale}/doctors`) ? 'active' : ''}`}>
                      <Link href={`/${locale}/doctors`} className="nav-link">
                        {t('nav.doctors')}
                      </Link>
                    </li>
                    <li className="nav-item me-3 d-lg-none mobile-lang-switcher">
                      <Link
                        href={`/${locale === 'en' ? 'ar' : 'en'}${pathname.replace(`/${locale}`, '')}`}
                        className="nav-link d-flex align-items-center"
                      >
                        <i className="feather-globe me-2" />
                        <span>{locale === 'en' ? 'العربية' : 'English'}</span>
                      </Link>
                    </li>
                  </ul>
                </div>
                <ul className="nav header-navbar-rht">
                  <li className="searchbar">
                    <Link href="#" onClick={toggleSearch}>
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

                  <li className="nav-item">
                    <Link
                      href="#"
                      className="btn btn-md btn-primary-gradient d-flex align-items-center rounded-pill"
                    >
                      <i className="isax isax-lock-1 me-2" />
                      <span>{t('header.login')}</span>
                    </Link>
                  </li>
                  {/* <li>
                    <Link
                      href={`/${locale}/register`}
                      className="btn btn-md btn-dark d-inline-flex align-items-center rounded-pill"
                    >
                      <i className="isax isax-user-tick me-1" />
                      {t('header.register')}
                    </Link>
                  </li> */}
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


