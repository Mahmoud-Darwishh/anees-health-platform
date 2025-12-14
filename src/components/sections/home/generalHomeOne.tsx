'use client';

import React, { useEffect } from 'react'
import Header from './header'
import HomeBanner from './homeBanner'
import 'aos/dist/aos.css';
import Footer from './footer';

import SectionSpeciality from './sectionSpeciality';
import SectionDoctor from './sectionDoctor';
import SectionService from './sectionService';
import SectionBook from './sectionBook';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionApp from './sectionApp';
import SectionArtical from './sectionArtical';


const GeneralHomeOne: React.FC = () => {
  useEffect(() => {
    let mounted = true;
    import('aos').then(({ default: AOS }) => {
      if (mounted) {
        AOS.init({ duration: 1000 });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='main-wrapper'>
      <Header />
      <HomeBanner />
      <SectionSpeciality />
      <SectionDoctor />
      <SectionService />
      <SectionBook />
      <SectionLogos />
      <SectionFaq />
      <SectionApp />
      <SectionArtical />
      <Footer />
    </div>
  )
}

export default GeneralHomeOne


