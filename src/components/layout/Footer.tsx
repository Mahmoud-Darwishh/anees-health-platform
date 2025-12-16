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
                      <ul>
                        <li>
                          <Link href="https://www.facebook.com/aneeshealthcare/">
                            <i className="fa-brands fa-facebook" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.tiktok.com/@aneeshealth">
                            <i className="fa-brands fa-tiktok" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.instagram.com/aneeshealth/">
                            <i className="fa-brands fa-instagram" />
                          </Link>
                        </li>
                        <li>
                          <Link href="https://www.linkedin.com/company/aneeshealth">
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
                      <Link href={`/${locale}/search-doctor`}>{t('footer.search_doctors')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/login`}>{t('header.login')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/register`}>{t('header.register')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/booking`}>{t('footer.booking')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/patient/dashboard`}>{t('footer.patient_dashboard')}</Link>
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
                      <Link href={`/${locale}/doctor/appointments`}>{t('footer.appointments')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/chat`}>{t('footer.chat')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/login`}>{t('header.login')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/doctor/register`}>{t('header.register')}</Link>
                    </li>
                    <li>
                      <Link href={`/${locale}/doctor/dashboard`}>{t('footer.doctor_dashboard')}</Link>
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
                    <div className="footer-address">
                      {" "}
                      <span>
                        <i className="fas fa-map-marker-alt" />
                      </span>
                      <p>
                        5th Settlement, New Cairo
                        <br />
                        Cairo, Egypt
                      </p>
                    </div>
                    <p>
                      <i className="fa-solid fa-mobile-screen-button" />
                      +201055164595
                    </p>
                    <p className="mb-0">
                      {" "}
                      <i className="fas fa-envelope" />
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
        <div className="footer-bottom">
          <div className="container-fluid">
            {/* Copyright */}
            <div className="copyright">
              <div className="row">
                <div className="col-md-6 col-lg-6">
                  <div className="copyright-text">
                    <p className="mb-0">
                      {t('footer.copyright')}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-6">
                  {/* Copyright Menu */}
                  <div className="copyright-menu">
                    <ul className="policy-menu">
                      <li>
                        <Link href={`/${locale}/terms`}>{t('footer.terms')}</Link>
                      </li>
                      <li>
                        <Link href={`/${locale}/privacy-policy`}>{t('footer.privacy')}</Link>
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


