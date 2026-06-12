import { createDocumentAction, deleteDocumentAction } from '../actions';
import { DocumentFileInput } from '../DocumentFileInput';
import { MAX_DOCUMENT_UPLOAD_BYTES } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';

export function DocumentsSections({ ctx }: { ctx: AdminPatientViewContext }) {
  const {
    patient,
    documents,
    documentsError,
    isTab,
  } = ctx;

  return (
    <>
          {isTab('documents') && (
          <div className="card bg-white">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Documents and files</h2>
              <span className="text-muted small">{documents.length} records</span>
            </div>
            <div className="card-body">
              <form action={createDocumentAction} className="row g-3 mb-3">
                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                <div className="col-md-5">
                  <label htmlFor="documentTitle" className="form-label">Document title</label>
                  <input id="documentTitle" name="documentTitle" className="form-control" placeholder="MRI report" required />
                </div>
                <div className="col-md-3">
                  <label htmlFor="documentCategory" className="form-label">Category</label>
                  <select id="documentCategory" name="documentCategory" className="form-select" defaultValue="report">
                    <option value="report">Report</option>
                    <option value="lab">Lab</option>
                    <option value="imaging">Imaging</option>
                    <option value="insurance">Insurance</option>
                    <option value="consent">Consent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="documentFile" className="form-label">File</label>
                  <DocumentFileInput
                    id="documentFile"
                    name="documentFile"
                    className="form-control"
                    maxBytes={MAX_DOCUMENT_UPLOAD_BYTES}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="documentDate" className="form-label">Document date</label>
                  <input id="documentDate" name="documentDate" type="date" className="form-control" />
                </div>
                <div className="col-12">
                  <label htmlFor="documentNote" className="form-label">Notes</label>
                  <textarea id="documentNote" name="documentNote" className="form-control" rows={2} placeholder="What this file contains or why it matters" dir="auto" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary">Upload document</button>
                </div>
              </form>

              {documentsError && <div className="alert alert-warning" role="alert">Could not load documents: {documentsError}</div>}
              {!documentsError && documents.length === 0 && <div className="alert alert-info mb-0" role="alert">No documents uploaded yet.</div>}
              {!documentsError && documents.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0 anees-documents-table">
                    <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Date</th><th className="text-end">Action</th></tr></thead>
                    <tbody>
                      {documents.map((document) => (
                        <tr key={document.id} className="anees-doc-row">
                          <td className="anees-doc-col-title" data-label="Title">
                            <div className="fw-semibold">{document.title}</div>
                            <div className="text-muted small">{document.author ?? '—'}</div>
                          </td>
                          <td className="text-capitalize anees-doc-col-category" data-label="Category">{document.category}</td>
                          <td className="text-muted small anees-doc-col-type" data-label="Type">{document.contentType ?? '—'}</td>
                          <td className="anees-doc-col-date" data-label="Date">{document.createdAt ? new Date(document.createdAt).toLocaleString('en-GB') : '—'}</td>
                          <td className="text-end anees-doc-actions" data-label="Actions">
                            <div className="d-inline-flex gap-2 anees-doc-actions-wrap">
                              <a className="btn btn-sm btn-outline-secondary" href={`/api/ehr/documents/${document.id}?disposition=inline`} target="_blank" rel="noopener noreferrer">View</a>
                              <a className="btn btn-sm btn-outline-primary" href={`/api/ehr/documents/${document.id}`}>Download</a>
                              <form action={deleteDocumentAction} className="d-inline d-flex gap-1">
                                <input type="hidden" name="medplumPatientId" value={patient.id ?? ''} />
                                <input type="hidden" name="documentId" value={document.id} />
                                <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
                              </form>
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
          )}
    </>
  );
}
