'use client';

import React from 'react'
import Link from "next/link";
import { useTranslations, useLocale } from 'next-intl';

const SectionList: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <>
      {/* List */}
      <div className="list-section">
        <div className="container">
          <div className="list-card card mb-0">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-center justify-content-xl-between flex-wrap gap-4 list-wraps">
                <Link href="/booking" className="list-item aos" data-reveal>
                  <div className="list-icon bg-bony" >
                    <img src="assets/img/icons/stethoscope.svg" alt="Doctor home visit icon - Book appointment" />
                  </div>
                  <h6>{t('home.list.doctor_visit')}</h6>
                </Link>

                <Link
                  href={`/${locale}/doctors`}
                  className="list-item aos"
                  data-reveal
                >
                  <div className="list-icon bg-primary">
                    <img src="assets/img/icons/list-icon-02.svg" alt="Physiotherapy icon - Home physical therapy" />
                  </div>
                  <h6>{t('home.list.physiotherapy')}</h6>
                </Link>
                
                <Link
                  href="/pages/hospitals"
                  className="list-item aos"
                  data-reveal
                >
                  <div className="list-icon bg-deer">
                    <img src="assets/img/icons/hospital.svg" alt="Hospital icon - Healthcare facilities" />
                  </div>
                  <h6>{t('home.list.hospitals')}</h6>
                </Link>
                <Link href="/" className="list-item aos" data-reveal>
                  <div className="list-icon bg-metallic-blue">
                    <img src="assets/img/icons/nurse.svg" alt="Home nursing icon - Professional nursing care" />
                  </div>
                  <h6>{t('home.list.nursing')}</h6>
                </Link>
                <Link
                  href="#"
                  className="list-item aos"
                  data-reveal
                >
                  <div className="list-icon bg-royal-blue">
                    <img src="assets/img/icons/list-icon-01.svg" alt="Telemedicine icon - Remote medical consultations" />
                  </div>
                  <h6>{t('home.list.telemedicine')}</h6>
                </Link>
                <Link
                  href="/"
                  className="list-item aos"
                  data-reveal
                >
                  <div className="list-icon bg-indigo-blue">
                    <img src="assets/img/icons/lab.svg" alt="Laboratory testing icon - Home lab tests" />
                  </div>
                  <h6>{t('home.list.lab_testing')}</h6>
                </Link>
                <Link
                  href="#"
                  className="list-item aos"
                  data-reveal
                >
                  <div className="list-icon bg-primary">
                    <img src="assets/img/icons/x-ray.svg" alt="X-ray and radiology icon - Medical imaging services" />
                  </div>
                  <h6>{t('home.list.radiology')}</h6>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /List */}
    </>

  )
}

export default SectionList



