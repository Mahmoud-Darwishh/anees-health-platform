'use client';

import React from 'react'
import Header from '@/components/layout/Header'
import HomeBanner from './homeBanner'
import Footer from '@/components/layout/Footer'

import SectionOurServices from './sectionOurServices';
import SectionDoctor from './sectionDoctor';
import SectionService from './sectionService';
import SectionBook from './sectionBook';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionApp from './sectionApp';
import SectionPackages from './sectionPackages';


const GeneralHomeOne: React.FC = () => {
  return (
    <div className='main-wrapper'>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <HomeBanner />
        <SectionOurServices />
        <SectionDoctor />
        <SectionService />
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


