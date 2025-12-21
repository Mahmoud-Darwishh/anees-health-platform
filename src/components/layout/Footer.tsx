'use client';

import Link from "next/link";
import { useLocale, useTranslations } from 'next-intl';

const Home3Footer = () => {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div>
      {/* Footer */}
      <footer className="footer footer-three">
        {/* Footer Top */}
        <div className="footer-top">
          <div className="container-fluid">
            <div className="row">
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-about">
                  <div className="footer-logo">
                    <img src="/assets/img/footer-logo.png" alt="logo" />
                  </div>
                  <div className="footer-about-content">
                    <p>
                      {t('footer.about_text')}
                    </p>
                    <div className="social-icon">
                      <ul className="list-unstyled d-flex gap-3 mb-0">
                        <li>
                          <Link href="https://www.facebook.com/aneeshealthcare/" className="text-decoration-none d-inline-flex" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-facebook" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.tiktok.com/@aneeshealth" className="text-decoration-none d-inline-flex" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-tiktok" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.instagram.com/aneeshealth/" className="text-decoration-none d-inline-flex" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-instagram" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.linkedin.com/company/aneeshealth" className="text-decoration-none d-inline-flex" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-linkedin" />
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                {/* /Footer Widget */}
              </div>
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-menu">
                  <h2 className="footer-title">{t('footer.for_patients')}</h2>
                  <ul>
                    <li>
                      <Link href={`/${locale}/doctors`}>{t('footer.search_doctors')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('header.login')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('header.register')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('footer.booking')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('footer.patient_dashboard')}</Link>
                    </li>
                  </ul>
                </div>
                {/* /Footer Widget */}
              </div>
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-menu">
                  <h2 className="footer-title">{t('footer.for_doctors')}</h2>
                  <ul>
                    <li>
                      <Link href="#">{t('footer.appointments')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('footer.chat')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('header.login')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('header.register')}</Link>
                    </li>
                    <li>
                      <Link href="#">{t('footer.doctor_dashboard')}</Link>
                    </li>
                  </ul>
                </div>
                {/* /Footer Widget */}
              </div>
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-contact">
                  <h2 className="footer-title">{t('footer.contact')}</h2>
                  <div className="footer-contact-info">
                    <div className="footer-address d-flex align-items-start gap-2 mb-3">
                      <span className="me-3">
                        <i className="fas fa-map-marker-alt" />
                      </span>
                      <p className="mb-3">
                        {t('footer.address')}
                        <br />
                        {t('footer.city')}
                      </p>
                    </div>
                    <p className="mb-2">
                      <i className="fa-solid fa-mobile-screen-button me-3 mb-3" />
                      +201055164595
                    </p>
                    <p className="mb-0">
                      <i className="fas fa-envelope me-3 mb-3" />
                      info@aneeshealth.com
                    </p>
                  </div>
                </div>
                {/* /Footer Widget */}
              </div>
            </div>
          </div>
        </div>
        {/* /Footer Top */}
        {/* Footer Bottom */}
        <div className="footer-bottom py-3">
          <div className="container-fluid">
            {/* Copyright */}
            <div className="copyright">
              <div className="row">
                <div className="col-md-6 col-lg-6">
                  <div className="copyright-text">
                    <p className="mb-0 text-white">
                      {t('footer.copyright')}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-6 text-end">
                  {/* Copyright Menu */}
                  <div className="copyright-menu">
                    <ul className="policy-menu no-separator list-unstyled d-flex gap-3 justify-content-end mb-0">
                      <li>
                        <Link href={`/${locale}/terms-and-conditions`} className="text-white text-decoration-none">{t('footer.terms')}</Link>
                      </li>
                      <li>
                        <Link href={`/${locale}/privacy-policy`} className="text-white text-decoration-none">{t('footer.privacy')}</Link>
                      </li>
                    </ul>
                  </div>
                  {/* /Copyright Menu */}
                </div>
              </div>
            </div>
            {/* /Copyright */}
          </div>
        </div>
        {/* /Footer Bottom */}
      </footer>
      {/* /Footer */}
    </div>
  );
};

export default Home3Footer;


