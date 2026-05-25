'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Header from '@/components/layout/Header'
import HomeBanner from './homeBanner'
import Footer from '@/components/layout/Footer'
import type { Doctor } from '@/features/doctors/components/doctorgrid/types';
import { useReveal } from '@/hooks/useReveal';

import SectionDoctor from './sectionDoctor';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionPackages from './sectionPackages';
import SectionWhyAnees from './sectionWhyAnees';
import SectionHowItWorks from './sectionHowItWorks';
import SectionStats from './sectionStats';
import SectionPatientStories from './sectionPatientStories';
import SectionCoverageStrip from './sectionCoverageStrip';
// NOTE: `sectionBook.tsx`, `sectionApp.tsx`, and `sectionOurServices.*` are
// unused on the home page. Flag for removal once stakeholders confirm no
// rollback is needed. Do not silently delete.

interface GeneralHomeOneProps {
  doctors: Doctor[];
}

const GeneralHomeOne: React.FC<GeneralHomeOneProps> = ({ doctors }) => {
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const locale = useLocale();
  // Wire scroll-reveal for every <Reveal>-wrapped section below.
  useReveal(mainRef, [pathname, locale]);

  return (
    <div className='main-wrapper'>
      <Header />
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        <HomeBanner />
        {/* Trust → Differentiator → Process → Offer → People → Proof → Stories → Coverage → Objections */}
        <SectionLogos />
        <SectionWhyAnees />
        <SectionHowItWorks />
        <SectionPackages />
        <SectionDoctor doctors={doctors} />
        <SectionStats />
        <SectionPatientStories />
        <SectionCoverageStrip />
        <SectionFaq />
      </main>
      <Footer />
    </div>
  )
}

export default GeneralHomeOne
