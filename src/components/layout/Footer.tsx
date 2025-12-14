import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const t = useTranslations('footer');
  const tHeader = useTranslations('header');
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
                    <Image 
                      src="/assets/img/footer-logo.png" 
                      alt="logo"
                      width={150}
                      height={50}
                      priority
                    />
                  </div>
                  <div className="footer-about-content">
                    <p>
                      {t('about_text')}
                    </p>
                    <div className="social-icon">
                      <ul>
                        <li>
                          <a href="https://www.facebook.com/aneeshealthcare/" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-facebook" />
                          </a>
                        </li>
                        <li>
                          <a href="https://www.tiktok.com/@aneeshealth" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-tiktok" />
                          </a>
                        </li>
                        <li>
                          <a href="https://www.instagram.com/aneeshealth/" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-instagram" />
                          </a>
                        </li>
                        <li>
                          <a href="https://www.linkedin.com/company/aneeshealth" target="_blank" rel="noopener noreferrer">
                            <i className="fa-brands fa-linkedin" />
                          </a>
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
                  <h2 className="footer-title">{t('for_patients')}</h2>
                  <ul>
                    <li>
                      <span>{t('search_doctors')}</span>
                    </li>
                    <li>
                      <span>{tHeader('login')}</span>
                    </li>
                    <li>
                      <span>{tHeader('register')}</span>
                    </li>
                    <li>
                      <span>{t('booking')}</span>
                    </li>
                    <li>
                      <span>{t('patient_dashboard')}</span>
                    </li>
                  </ul>
                </div>
                {/* /Footer Widget */}
              </div>
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-menu">
                  <h2 className="footer-title">{t('for_doctors')}</h2>
                  <ul>
                    <li>
                      <span>{t('appointments')}</span>
                    </li>
                    <li>
                      <span>{t('chat')}</span>
                    </li>
                    <li>
                      <span>{tHeader('login')}</span>
                    </li>
                    <li>
                      <span>{tHeader('register')}</span>
                    </li>
                    <li>
                      <span>{t('doctor_dashboard')}</span>
                    </li>
                  </ul>
                </div>
                {/* /Footer Widget */}
              </div>
              <div className="col-lg-3 col-md-6">
                {/* Footer Widget */}
                <div className="footer-widget footer-contact">
                  <h2 className="footer-title">{t('contact')}</h2>
                  <div className="footer-contact-info">
                    <div className="footer-address">
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
                      {t('copyright')}
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-lg-6">
                  {/* Copyright Menu */}
                  <div className="copyright-menu">
                    <ul className="policy-menu">
                      <li>
                        <span>{t('terms')}</span>
                      </li>
                      <li>
                        <span>{t('privacy')}</span>
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
}
