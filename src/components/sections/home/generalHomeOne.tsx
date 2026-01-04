'use client';

import React, { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import Header from '@/components/layout/Header'
import HomeBanner from './homeBanner'
import Footer from '@/components/layout/Footer'
import { useReveal } from '@/hooks/useReveal';

import SectionSpeciality from './sectionSpeciality';
import SectionDoctor from './sectionDoctor';
import SectionService from './sectionService';
import SectionBook from './sectionBook';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionApp from './sectionApp';
import SectionPackages from './sectionPackages';
import { Reveal } from '@/components/common/Reveal';


const GeneralHomeOne: React.FC = () => {
  const pathname = usePathname();
  const locale = useLocale();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useReveal(wrapperRef, [pathname, locale]);

  return (
    <div ref={wrapperRef} className='main-wrapper' key={locale}>
      <Header />
      <HomeBanner />
      <Reveal><SectionSpeciality /></Reveal>
      <Reveal><SectionDoctor /></Reveal>
      <Reveal><SectionService /></Reveal>
      <Reveal><SectionBook /></Reveal>
      <Reveal><SectionPackages /></Reveal>
      <Reveal><SectionLogos /></Reveal>
      <Reveal><SectionFaq /></Reveal>
      <Reveal><SectionApp /></Reveal>
      <Footer />
    </div>
  )
}

export default GeneralHomeOne


