import type { PortalContext } from '../view-context';
import { ButtonLink, EmptyState } from '@/components/ui';
import styles from '../portal.module.scss';

/** Files tab — medical documents (lab PDFs, scans) with view/download. */
export function DocumentsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDateTime, documents } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('documentsTitle')}</h2>
        <span className="text-muted small">{documents.length}</span>
      </div>
      <div className="card-body">
        {documents.length === 0 ? (
          <EmptyState experience="ops" compact title={t('none')} />
        ) : (
          <div className={`table-responsive ${styles.tableWrap}`}>
            <table className={`table table-sm align-middle mb-0 ${styles.documentsTable}`}>
              <thead>
                <tr>
                  <th>{t('documentLabel')}</th>
                  <th>{t('documentCategory')}</th>
                  <th>{t('documentDate')}</th>
                  <th className="text-end">{t('documentAction')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td className={styles.docCellTitle} data-label={t('documentLabel')}>
                      <div className="fw-semibold">{document.title}</div>
                      <div className="text-muted small">{document.author ?? '—'}</div>
                    </td>
                    <td className="text-capitalize" data-label={t('documentCategory')}>
                      {document.category}
                    </td>
                    <td data-label={t('documentDate')}>{formatDateTime(document.createdAt)}</td>
                    <td className={`text-end ${styles.docActions}`} data-label={t('documentAction')}>
                      <div className={styles.docActionsWrap}>
                        <ButtonLink
                          href={`/api/ehr/documents/${document.id}?disposition=inline`}
                          size="sm"
                          variant="outline"
                          experience="ops"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('documentView')}
                        </ButtonLink>
                        <ButtonLink href={`/api/ehr/documents/${document.id}`} size="sm" experience="ops">
                          {t('documentDownload')}
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Files tab — lab orders (ServiceRequest) and results (DiagnosticReport). */
export function LabsSection({ ctx }: { ctx: PortalContext }) {
  const { t, formatDate, labOrders, labResults } = ctx;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('labsTitle')}</h2>
        <span className="text-muted small">
          {labOrders.length} {t('labsOrdersSuffix')} · {labResults.length} {t('labsResultsSuffix')}
        </span>
      </div>
      <div className="card-body">
        <div className="row g-4">
          <div className="col-lg-6">
            <h3 className="h6">{t('labsOrdersTitle')}</h3>
            {labOrders.length === 0 ? (
              <EmptyState experience="ops" compact title={t('none')} />
            ) : (
              <div className={`table-responsive ${styles.tableWrap}`}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>{t('documentLabel')}</th>
                      <th>{t('medicationStatus')}</th>
                      <th>{t('documentCategory')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <div className="fw-semibold">{order.title}</div>
                          <div className="text-muted small">{order.note ?? '—'}</div>
                        </td>
                        <td className="text-capitalize">{order.status}</td>
                        <td className="text-capitalize">{order.category ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="col-lg-6">
            <h3 className="h6">{t('labsResultsTitle')}</h3>
            {labResults.length === 0 ? (
              <EmptyState experience="ops" compact title={t('none')} />
            ) : (
              <div className={`table-responsive ${styles.tableWrap}`}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>{t('documentLabel')}</th>
                      <th>{t('medicationStatus')}</th>
                      <th>{t('documentDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labResults.map((result) => (
                      <tr key={result.id}>
                        <td>
                          <div className="fw-semibold">{result.title}</div>
                          <div className="text-muted small">{result.conclusion ?? '—'}</div>
                        </td>
                        <td className="text-capitalize">{result.status}</td>
                        <td>{formatDate(result.issued ?? result.effective)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
