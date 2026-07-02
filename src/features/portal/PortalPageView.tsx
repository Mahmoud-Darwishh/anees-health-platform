import Image from 'next/image';
import Link from 'next/link';
import { dayGreeting } from './helpers';
import type { PortalContext } from './view-context';
import type { PortalWorkspaceTab } from './types';
import { JourneyHeroSection, ProfileSection, ClinicalDepthSection, EngagementSection } from './views/overview-sections';
import {
  ProblemsSection,
  AllergiesSection,
  MedicationsSection,
  AssessmentsSection,
} from './views/clinical-sections';
import { DocumentsSection, LabsSection } from './views/files-sections';
import { CarePlansSection, CareTeamSection } from './views/care-sections';
import { VisitsSection, VitalsSection, NotesSection, TasksSection } from './views/activity-sections';
import { UpcomingVisitsSection } from './views/upcoming-visits-section';
import styles from './portal.module.scss';

/**
 * Renders the patient portal workspace: the brand hero, the tab strip, and the
 * sections for the active tab. All data/derivation lives in `ctx` (built by
 * `buildPortalContext`); this component only orchestrates layout + which
 * sections show per tab. Each tab loads only its own data (see `loadPortalData`).
 */
export function PortalPageView({ ctx }: { ctx: PortalContext }) {
  const { t, locale, activeTab, record, canSeeClinicalDepth } = ctx;

  const firstName = record.patient.fullName.split(' ')[0];
  const greetingLine = `${dayGreeting(t)} ${firstName}`;
  const loyaltyMessage = t('brand.loyaltyMessage');
  const supportMessage = t('brand.supportMessage');

  const portalTabs: Array<{ id: PortalWorkspaceTab; label: string }> = [
    { id: 'overview', label: t('nav.overview') },
    { id: 'clinical', label: t('nav.medical') },
    { id: 'files', label: t('nav.labs') },
    { id: 'care', label: t('nav.care') },
    { id: 'visits', label: t('nav.visits') },
    { id: 'vitals', label: t('vitals.title') },
    { id: 'notes', label: t('doctorNotes.title') },
    { id: 'tasks', label: t('care.tasks') },
  ];
  const tabHref = (nextTab: PortalWorkspaceTab) => `/${locale}/portal?tab=${nextTab}`;

  const clinicalRestricted = (activeTab === 'clinical' || activeTab === 'files') && !canSeeClinicalDepth;

  return (
    <main className={`container ${styles.portalShell}`}>
      <div className={styles.portalHero}>
        <div>
          <div className={styles.brandLockup}>
            <Image
              src="/assets/img/anees-logo.png"
              alt={t('brand.logoAlt')}
              width={56}
              height={56}
              className={styles.brandLogo}
            />
            <div>
              <p className={styles.kicker}>{t('kicker')}</p>
              <p className={styles.brandLoyalty}>{loyaltyMessage}</p>
            </div>
          </div>
          <p className={styles.heroGreeting}>{greetingLine}</p>
          <h1 className={styles.heroTitle}>{t('title')}</h1>
          <p className={styles.heroSupport}>{supportMessage}</p>
          {record.access.mode === 'caregiver' ? (
            <p className={styles.caregiverBadge}>{t('caregiverAccessBadge')}</p>
          ) : null}
        </div>
        <div className={styles.portalChip}>{record.patient.code}</div>
        <Link href={`/${locale}`} className={`btn btn-sm ${styles.backButton}`}>
          {t('goHomeCta')}
        </Link>
      </div>

      <div className={`card ${styles.sectionCard}`}>
        <div className="card-body py-2">
          <nav className={styles.tabNav} aria-label={t('workspace.tabsLabel')}>
            {portalTabs.map((portalTab) => {
              const isActive = activeTab === portalTab.id;

              return (
                <Link
                  key={portalTab.id}
                  href={tabHref(portalTab.id)}
                  className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {portalTab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && <JourneyHeroSection ctx={ctx} />}
      {activeTab === 'overview' && <ProfileSection ctx={ctx} />}
      {activeTab === 'overview' && <ClinicalDepthSection ctx={ctx} />}

      {clinicalRestricted ? (
        <div className={`card ${styles.sectionCard}`}>
          <div className="card-body">
            <div className="alert alert-warning mb-0" role="alert">
              {t('consentRestricted')}
            </div>
          </div>
        </div>
      ) : null}

      {canSeeClinicalDepth && (activeTab === 'clinical' || activeTab === 'files') ? (
        <>
          {activeTab === 'clinical' && <ProblemsSection ctx={ctx} />}
          {activeTab === 'clinical' && <AllergiesSection ctx={ctx} />}
          {activeTab === 'clinical' && <MedicationsSection ctx={ctx} />}
          {activeTab === 'files' && <DocumentsSection ctx={ctx} />}
          {activeTab === 'files' && <LabsSection ctx={ctx} />}
          {activeTab === 'clinical' && <AssessmentsSection ctx={ctx} />}
        </>
      ) : null}

      {activeTab === 'care' && <CarePlansSection ctx={ctx} />}
      {activeTab === 'care' && <CareTeamSection ctx={ctx} />}
      {(activeTab === 'care' || activeTab === 'overview') && <EngagementSection ctx={ctx} />}

      {(activeTab === 'visits' || activeTab === 'overview') && <UpcomingVisitsSection ctx={ctx} />}
      {activeTab === 'visits' && <VisitsSection ctx={ctx} />}
      {activeTab === 'vitals' && <VitalsSection ctx={ctx} />}
      {activeTab === 'notes' && <NotesSection ctx={ctx} />}
      {activeTab === 'tasks' && <TasksSection ctx={ctx} />}
    </main>
  );
}
