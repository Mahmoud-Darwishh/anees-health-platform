import React from 'react';
import Header from '@/components/layout/Header'
import HomeBanner from './homeBanner'
import Footer from '@/components/layout/Footer'
import type { Doctor } from '@/features/doctors/components/doctorgrid/types';
import HomeRevealRoot from './HomeRevealRoot';

import SectionDoctor from './sectionDoctor';
import SectionLogos from './sectionLogos';
import SectionFaq from './sectionFaq';
import SectionPackages from './sectionPackages';
import SectionWhyAnees from './sectionWhyAnees';
import SectionHowItWorks from './sectionHowItWorks';
import SectionStats from './sectionStats';
import SectionPatientStories from './sectionPatientStories';
import SectionCoverageStrip from './sectionCoverageStrip';

interface GeneralHomeOneProps {
  doctors: Doctor[];
}

// Server component. Only HomeRevealRoot and the three interactive carousels
// (Doctor, Packages, PatientStories) + Faq accordion ship to the client bundle.
const GeneralHomeOne: React.FC<GeneralHomeOneProps> = ({ doctors }) => {
  return (
    <div className='main-wrapper'>
      <Header />
      <HomeRevealRoot>
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
      </HomeRevealRoot>
      <Footer />
    </div>
  )
}

export default GeneralHomeOne
