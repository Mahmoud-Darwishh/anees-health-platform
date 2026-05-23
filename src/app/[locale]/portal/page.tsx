import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { submitVisitRequestAction, updatePatientProfileAction } from './actions';
import styles from './portal.module.scss';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
};

function formatDate(value: Date | null, locale: string): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(value);
}

function formatVisitType(value: string): string {
  return value === 'telemedicine' ? 'Telemedicine' : 'In-home';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PatientPortalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: 'portal' });
  const session = await auth();

  if (!session || session.user.role !== 'patient') {
    redirect(`/${locale}/auth/login?callbackUrl=/${locale}/portal`);
  }

  if (!session.user.patientId) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerCard}>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </header>

          <article className={styles.emptyCard}>
            <h2>{t('notLinkedTitle')}</h2>
            <p>{t('notLinkedText')}</p>
            <Link href={`/${locale}/auth/link-account`} className={styles.primaryBtn}>
              {t('linkAccountCta')}
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: session.user.patientId },
    select: {
      id: true,
      code: true,
      fullName: true,
      phone: true,
      status: true,
      gender: true,
      dateOfBirth: true,
      registrationDate: true,
      primaryCaregiver: true,
      caregiverRelation: true,
      chiefComplaint: true,
      notes: true,
      addressDetail: true,
      area: { select: { name: true } },
      visits: {
        orderBy: { scheduledDate: 'desc' },
        take: 6,
        select: {
          id: true,
          code: true,
          scheduledDate: true,
          status: true,
          visitType: true,
          service: { select: { name: true } },
          provider: { select: { fullName: true } },
        },
      },
      carePlans: {
        where: { status: 'active' },
        select: { id: true },
      },
    },
  });

  if (!patient) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.headerCard}>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </header>

          <article className={styles.emptyCard}>
            <h2>{t('notFoundTitle')}</h2>
            <p>{t('notFoundText')}</p>
            <Link href={`/${locale}`} className={styles.primaryBtn}>
              {t('goHomeCta')}
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalVisits = await prisma.visit.count({ where: { patientId: patient.id } });
  const upcomingVisits = await prisma.visit.count({
    where: {
      patientId: patient.id,
      scheduledDate: { gte: today },
      status: { in: ['scheduled', 'rescheduled', 'in_progress'] },
    },
  });

  const recentVisits = patient.visits;
  const actionableUpcomingVisits = recentVisits.filter((visit) =>
    ['scheduled', 'rescheduled', 'in_progress'].includes(visit.status)
  );
  const lastVisit = recentVisits[0] ?? null;

  const documents = [
    {
      id: 'doc-1',
      title: t('documents.items.1.title'),
      type: t('documents.items.1.type'),
      status: t('documents.items.1.status'),
      date: t('documents.items.1.date'),
    },
    {
      id: 'doc-2',
      title: t('documents.items.2.title'),
      type: t('documents.items.2.type'),
      status: t('documents.items.2.status'),
      date: t('documents.items.2.date'),
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        {query.updated && <p className={styles.noticeSuccess}>{t('messages.updated')}</p>}
        {query.error && <p className={styles.noticeError}>{t('messages.error')}</p>}

        <header className={styles.headerCard}>
          <div>
            <p className={styles.kicker}>{t('kicker')}</p>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <span className={styles.statusPill}>{t(`status.${patient.status}`)}</span>
        </header>

        <section className={styles.statsGrid} aria-label={t('summaryLabel')}>
          <article className={styles.statCard}>
            <p>{t('summary.totalVisits')}</p>
            <strong>{totalVisits}</strong>
          </article>
          <article className={styles.statCard}>
            <p>{t('summary.upcomingVisits')}</p>
            <strong>{upcomingVisits}</strong>
          </article>
          <article className={styles.statCard}>
            <p>{t('summary.activeCarePlans')}</p>
            <strong>{patient.carePlans.length}</strong>
          </article>
          <article className={styles.statCard}>
            <p>{t('summary.lastVisit')}</p>
            <strong>{lastVisit ? formatDate(lastVisit.scheduledDate, locale) : t('none')}</strong>
          </article>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <h2>{t('profile.title')}</h2>
              <span className={styles.editBadge}>{t('profile.editable')}</span>
            </div>
            <dl className={styles.metaList}>
              <div>
                <dt>{t('profile.caseId')}</dt>
                <dd>{patient.code}</dd>
              </div>
              <div>
                <dt>{t('profile.fullName')}</dt>
                <dd>{patient.fullName}</dd>
              </div>
              <div>
                <dt>{t('profile.phone')}</dt>
                <dd>{patient.phone}</dd>
              </div>
              <div>
                <dt>{t('profile.gender')}</dt>
                <dd>{patient.gender ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('profile.dateOfBirth')}</dt>
                <dd>{formatDate(patient.dateOfBirth, locale)}</dd>
              </div>
              <div>
                <dt>{t('profile.registrationDate')}</dt>
                <dd>{formatDate(patient.registrationDate, locale)}</dd>
              </div>
              <div>
                <dt>{t('profile.area')}</dt>
                <dd>{patient.area?.name ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('profile.address')}</dt>
                <dd>{patient.addressDetail ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('profile.caregiver')}</dt>
                <dd>{patient.primaryCaregiver ?? '-'}</dd>
              </div>
              <div>
                <dt>{t('profile.caregiverRelation')}</dt>
                <dd>{patient.caregiverRelation ?? '-'}</dd>
              </div>
            </dl>

            <form action={updatePatientProfileAction} className={styles.profileForm}>
              <input type="hidden" name="locale" value={locale} />
              <h3>{t('profile.updateTitle')}</h3>

              <label>
                {t('profile.phone')}
                <input name="phone" defaultValue={patient.phone} required maxLength={32} />
              </label>

              <label>
                {t('profile.address')}
                <textarea name="addressDetail" defaultValue={patient.addressDetail ?? ''} rows={2} maxLength={300} />
              </label>

              <label>
                {t('profile.caregiver')}
                <input name="primaryCaregiver" defaultValue={patient.primaryCaregiver ?? ''} maxLength={120} />
              </label>

              <label>
                {t('profile.caregiverRelation')}
                <input name="caregiverRelation" defaultValue={patient.caregiverRelation ?? ''} maxLength={120} />
              </label>

              <button type="submit" className={styles.primaryBtn}>{t('profile.saveChanges')}</button>
            </form>
          </article>

          <article className={styles.card}>
            <h2>{t('clinical.title')}</h2>
            <div className={styles.textBlock}>
              <h3>{t('clinical.chiefComplaint')}</h3>
              <p>{patient.chiefComplaint ?? t('none')}</p>
            </div>
            <div className={styles.textBlock}>
              <h3>{t('clinical.notes')}</h3>
              <p>{patient.notes ?? t('none')}</p>
            </div>
            <p className={styles.disclaimer}>{t('clinical.disclaimer')}</p>
          </article>
        </section>

        <article className={styles.card}>
          <h2>{t('requests.title')}</h2>
          {actionableUpcomingVisits.length === 0 ? (
            <p className={styles.emptyText}>{t('requests.empty')}</p>
          ) : (
            <div className={styles.requestGrid}>
              {actionableUpcomingVisits.map((visit) => (
                <section key={visit.id} className={styles.requestCard}>
                  <p className={styles.requestMeta}>
                    <strong>{visit.service.name}</strong> • {formatDate(visit.scheduledDate, locale)}
                  </p>
                  <p className={styles.requestSub}>
                    {t('visits.provider')}: {visit.provider?.fullName ?? t('none')}
                  </p>

                  <form action={submitVisitRequestAction} className={styles.requestFormRow}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="confirm" />
                    <button type="submit" className={styles.secondaryBtn}>{t('requests.confirm')}</button>
                  </form>

                  <form action={submitVisitRequestAction} className={styles.requestFormColumn}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="reschedule" />
                    <label>
                      {t('requests.preferredDate')}
                      <input type="date" name="requestedDate" />
                    </label>
                    <label>
                      {t('requests.notes')}
                      <input name="requestNotes" maxLength={500} placeholder={t('requests.reschedulePlaceholder')} />
                    </label>
                    <button type="submit" className={styles.secondaryBtn}>{t('requests.reschedule')}</button>
                  </form>

                  <form action={submitVisitRequestAction} className={styles.requestFormColumn}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="visitId" value={visit.id} />
                    <input type="hidden" name="requestType" value="cancel" />
                    <label>
                      {t('requests.notes')}
                      <input name="requestNotes" maxLength={500} placeholder={t('requests.cancelPlaceholder')} />
                    </label>
                    <button type="submit" className={styles.dangerBtn}>{t('requests.cancel')}</button>
                  </form>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className={styles.card}>
          <h2>{t('documents.title')}</h2>
          <p className={styles.documentsIntro}>{t('documents.subtitle')}</p>
          <div className={styles.docsGrid}>
            {documents.map((doc) => (
              <section key={doc.id} className={styles.docCard}>
                <p className={styles.docType}>{doc.type}</p>
                <h3>{doc.title}</h3>
                <p>{doc.date}</p>
                <span className={styles.docStatus}>{doc.status}</span>
              </section>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h2>{t('visits.title')}</h2>
          {recentVisits.length === 0 ? (
            <p className={styles.emptyText}>{t('visits.empty')}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('visits.date')}</th>
                    <th>{t('visits.service')}</th>
                    <th>{t('visits.provider')}</th>
                    <th>{t('visits.type')}</th>
                    <th>{t('visits.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{formatDate(visit.scheduledDate, locale)}</td>
                      <td>{visit.service.name}</td>
                      <td>{visit.provider?.fullName ?? '-'}</td>
                      <td>{formatVisitType(visit.visitType)}</td>
                      <td>
                        <span className={styles.visitStatus}>{t(`visitStatus.${visit.status}`)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
