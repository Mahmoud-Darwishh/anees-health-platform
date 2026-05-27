import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { PortalSectionCard } from '@/features/portal/components/PortalSectionCard';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import portalStyles from '../../portal.module.scss';
import styles from './document.module.scss';

type Props = {
  params: Promise<{ locale: string; id: string }>;
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

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });
  return {
    title: t('documents.viewerTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PortalDocumentPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'portal' });

  const session = await auth();
  if (!session?.user || session.user.role !== 'patient' || !session.user.patientId) {
    redirect(`/${locale}/auth/login`);
  }

  const document = await prisma.document.findFirst({
    where: { id, patientId: session.user.patientId, deletedAt: null },
    include: { visit: true },
  });

  if (!document) {
    notFound();
  }

  // Files are stored privately; the streaming API enforces auth + ownership.
  const hasFile = typeof document.storagePath === 'string' && document.storagePath.length > 0;
  const fileHref = hasFile ? `/api/portal/documents/${document.id}/file` : '#';
  const downloadHref = hasFile ? `${fileHref}?download=1` : '#';

  return (
    <div className={portalStyles.page}>
      <div className={`${portalStyles.shell} ${styles.shell}`}>
        <Link href={`/${locale}/portal#labs`} className={styles.backLink}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          <span>{t('documents.backToLabs')}</span>
        </Link>

        <PortalSectionCard
          className={portalStyles.panelCard}
          title={document.title}
          subtitle={t('documents.viewerSubtitle')}
        >
          <div className={portalStyles.twoCol}>
            <div className={portalStyles.infoTile}>
              <h3>{t('workspace.category')}</h3>
              <p>{document.category}</p>
            </div>
            <div className={portalStyles.infoTile}>
              <h3>{t('workspace.recordDate')}</h3>
              <p>{formatDate(document.createdAt, locale)}</p>
            </div>
            <div className={portalStyles.infoTile}>
              <h3>{t('documents.mimeType')}</h3>
              <p>{document.mimeType ?? '-'}</p>
            </div>
            <div className={portalStyles.infoTile}>
              <h3>{t('documents.fileSize')}</h3>
              <p>{formatSize(document.fileSizeBytes)}</p>
            </div>
            {document.visit ? (
              <div className={portalStyles.infoTile}>
                <h3>{t('documents.linkedVisit')}</h3>
                <p>{document.visit.code}</p>
                <small>{formatDate(document.visit.scheduledDate, locale)}</small>
              </div>
            ) : null}
            <div className={portalStyles.infoTile}>
              <h3>{t('financial.status')}</h3>
              <p>
                {hasFile ? (
                  <span className={portalStyles.statusReady}>{t('documents.ready')}</span>
                ) : (
                  <span className={portalStyles.statusPending}>{t('documents.pending')}</span>
                )}
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            {hasFile ? (
              <>
                <a
                  className={styles.openBtn}
                  href={fileHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
                  <span>{t('documents.openFile')}</span>
                </a>
                <a className={styles.openBtn} href={downloadHref}>
                  <i className="fa-solid fa-download" aria-hidden="true" />
                  <span>{t('documents.download')}</span>
                </a>
              </>
            ) : (
              <span className={styles.disabledBtn}>
                <i className="fa-solid fa-clock" aria-hidden="true" />
                <span>{t('documents.awaitingUpload')}</span>
              </span>
            )}
          </div>
        </PortalSectionCard>
      </div>
    </div>
  );
}
