'use client';

import React from 'react'
import Header from '@/components/layout/Header'
import HomeBanner from './homeBanner'
import Footer from '@/components/layout/Footer'
import type { Doctor } from '@/features/doctors/components/doctorgrid/types';

import SectionOurServices from './sectionOurServices';
import SectionDoctor from './sectionDoctor';
import SectionBook from './sectionBook';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionApp from './sectionApp';
import SectionPackages from './sectionPackages';

interface GeneralHomeOneProps {
  doctors: Doctor[];
}

const GeneralHomeOne: React.FC<GeneralHomeOneProps> = ({ doctors }) => {
  return (
    <div className='main-wrapper'>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <HomeBanner />
        <SectionOurServices />
        <SectionDoctor doctors={doctors} />
        <SectionBook />
        <SectionPackages />
        <SectionLogos />
        <SectionFaq />
        <SectionApp />
      </main>
      <Footer />
    </div>
  )
}

export default GeneralHomeOne


