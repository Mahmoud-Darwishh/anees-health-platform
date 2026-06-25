import 'server-only';

import { getMedplumClient } from './client';
import {
	MEDPLUM_CODE_SYSTEMS,
	isRestrictedTierClinicalCoding,
	isRestrictedTierSecurityCoding,
} from './constants';
import {
	deletePrivateMedicalObject,
	putPrivateMedicalObject,
} from '@/lib/storage/r2-medical';
import { scanMedicalDocument } from '@/lib/security/malware-scan';

type FhirReference = {
	reference?: string;
	display?: string;
};

type FhirCoding = {
	system?: string;
	code?: string;
	display?: string;
};

type FhirIdentifier = {
	system?: string;
	value?: string;
};

export type DocumentReferenceResource = {
	resourceType: 'DocumentReference';
	id?: string;
	meta?: {
		security?: FhirCoding[];
	};
	status: 'current' | 'superseded' | 'entered-in-error';
	identifier?: FhirIdentifier[];
	subject?: FhirReference;
	type?: { coding?: FhirCoding[]; text?: string };
	category?: Array<{ coding?: FhirCoding[] }>;
	date?: string;
	author?: FhirReference[];
	content: Array<{
		attachment: {
			contentType?: string;
			title?: string;
			url?: string;
			size?: number;
		};
	}>;
};

const R2_ATTACHMENT_PREFIX = 'urn:anees:r2:';
const IDENTIFIER_SYSTEM_CHECKSUM_SHA256 = 'https://anees.health/fhir/identifier/document-checksum-sha256';
const IDENTIFIER_SYSTEM_MALWARE_STATUS = 'https://anees.health/fhir/identifier/document-malware-status';
const IDENTIFIER_SYSTEM_MALWARE_SCANNED_AT = 'https://anees.health/fhir/identifier/document-malware-scanned-at';
const IDENTIFIER_SYSTEM_MALWARE_ENGINE = 'https://anees.health/fhir/identifier/document-malware-engine';
const IDENTIFIER_SYSTEM_MALWARE_SIGNATURE = 'https://anees.health/fhir/identifier/document-malware-signature';
const MALWARE_SECURITY_SYSTEM = 'https://anees.health/fhir/security/document-malware';

export type DocumentCategory = 'report' | 'lab' | 'imaging' | 'insurance' | 'consent' | 'other';
export type MalwareStatus = 'pending' | 'clean' | 'infected' | 'scan_failed';

export type DocumentSummary = {
	id: string;
	title: string;
	category: DocumentCategory;
	contentType?: string;
	createdAt?: string;
	author?: string;
	sizeBytes?: number;
	restrictedTier: boolean;
	malwareStatus: MalwareStatus;
};

export type CreatePatientDocumentInput = {
	patientId: string;
	title: string;
	originalFilename: string;
	contentType: string;
	data: Buffer;
	category?: DocumentCategory;
	note?: string | null;
	authorReference?: string | null;
	authorDisplay?: string | null;
	documentDate?: Date | null;
};

function upsertIdentifier(
	identifiers: FhirIdentifier[] | undefined,
	system: string,
	value: string,
): FhirIdentifier[] {
	const next = [...(identifiers ?? []).filter((item) => item.system !== system)];
	next.push({ system, value });
	return next;
}

function removeIdentifier(identifiers: FhirIdentifier[] | undefined, system: string): FhirIdentifier[] {
	return [...(identifiers ?? []).filter((item) => item.system !== system)];
}

function getIdentifierValue(document: DocumentReferenceResource, system: string): string | undefined {
	return document.identifier?.find((item) => item.system === system)?.value;
}

function toMalwareStatus(value: string | undefined): MalwareStatus {
	switch ((value ?? '').toLowerCase()) {
		case 'clean':
			return 'clean';
		case 'infected':
			return 'infected';
		case 'scan_failed':
			return 'scan_failed';
		default:
			return 'pending';
	}
}

function withMalwareSecurityCoding(document: DocumentReferenceResource, status: MalwareStatus): FhirCoding[] {
	const existing = [...(document.meta?.security ?? []).filter((coding) => coding.system !== MALWARE_SECURITY_SYSTEM)];
	existing.push({
		system: MALWARE_SECURITY_SYSTEM,
		code: status,
		display: status.replace('_', ' '),
	});
	return existing;
}

export function toR2DocumentAttachmentUrl(objectKey: string): string {
	return `${R2_ATTACHMENT_PREFIX}${encodeURIComponent(objectKey)}`;
}

export function extractR2ObjectKey(reference?: string): string | undefined {
	if (!reference) {
		return undefined;
	}

	const trimmed = reference.trim();
	if (!trimmed.startsWith(R2_ATTACHMENT_PREFIX)) {
		return undefined;
	}

	const encodedKey = trimmed.slice(R2_ATTACHMENT_PREFIX.length);
	if (!encodedKey) {
		return undefined;
	}

	try {
		const decoded = decodeURIComponent(encodedKey);
		return decoded || undefined;
	} catch {
		return undefined;
	}
}

function extractCategory(document: DocumentReferenceResource): DocumentCategory {
	const code = document.category?.[0]?.coding?.[0]?.code?.toLowerCase();
	switch (code) {
		case 'lab':
		case 'imaging':
		case 'insurance':
		case 'consent':
		case 'other':
			return code;
		default:
			return 'report';
	}
}

export function getDocumentMalwareStatus(document: DocumentReferenceResource): MalwareStatus {
	return toMalwareStatus(getIdentifierValue(document, IDENTIFIER_SYSTEM_MALWARE_STATUS));
}

export function getDocumentChecksumSha256(document: DocumentReferenceResource): string | null {
	const checksum = getIdentifierValue(document, IDENTIFIER_SYSTEM_CHECKSUM_SHA256)?.trim().toLowerCase();
	if (!checksum) return null;
	return /^[a-f0-9]{64}$/.test(checksum) ? checksum : null;
}

function summarizeDocument(document: DocumentReferenceResource): DocumentSummary | null {
	if (!document.id) return null;

	const attachment = document.content?.[0]?.attachment;
	const securityCoding = document.meta?.security ?? [];
	const categoryCoding = document.category?.flatMap((item) => item.coding ?? []) ?? [];
	const typeCoding = document.type?.coding ?? [];
	const restrictedTier = [
		...securityCoding.map((coding) => isRestrictedTierSecurityCoding(coding)),
		...categoryCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
		...typeCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
	].some(Boolean);

	return {
		id: document.id,
		title: attachment?.title ?? document.type?.text ?? 'Document',
		category: extractCategory(document),
		contentType: attachment?.contentType,
		createdAt: document.date,
		author: document.author?.[0]?.display,
		sizeBytes: attachment?.size,
		restrictedTier,
		malwareStatus: getDocumentMalwareStatus(document),
	};
}

export async function listPatientDocuments(patientId: string, count = 50): Promise<DocumentSummary[]> {
	const medplum = await getMedplumClient();

	const documents = (await medplum.searchResources('DocumentReference', {
		subject: `Patient/${patientId}`,
		_count: String(count),
		_sort: '-date',
	})) as DocumentReferenceResource[];

	return documents.map(summarizeDocument).filter((item): item is DocumentSummary => !!item);
}

export async function listDocumentsForMalwareScan(
	count = 50,
	includeFailed = false,
): Promise<DocumentReferenceResource[]> {
	const medplum = await getMedplumClient();

	const documents = (await medplum.searchResources('DocumentReference', {
		_count: String(count),
		_sort: '-date',
	})) as DocumentReferenceResource[];

	return documents.filter((document) => {
		const objectKey = extractR2ObjectKey(document.content?.[0]?.attachment?.url);
		if (!objectKey) {
			return false;
		}

		if (includeFailed) {
			return true;
		}

		const status = getDocumentMalwareStatus(document);
		return status !== 'scan_failed';
	});
}

export async function getPatientDocumentReference(documentId: string): Promise<DocumentReferenceResource | null> {
	const medplum = await getMedplumClient();
	const normalizedId = documentId.trim().replace(/^DocumentReference\//i, '');

	if (!normalizedId) {
		return null;
	}

	try {
		return (await medplum.readResource('DocumentReference', normalizedId)) as DocumentReferenceResource;
	} catch {
		try {
			const byId = (await medplum.searchResources('DocumentReference', {
				_id: normalizedId,
				_count: '1',
			})) as DocumentReferenceResource[];

			if (byId[0]) {
				return byId[0];
			}
		} catch {
			// No-op: fallback below.
		}

		try {
			const byIdentifier = (await medplum.searchResources('DocumentReference', {
				identifier: normalizedId,
				_count: '1',
			})) as DocumentReferenceResource[];

			return byIdentifier[0] ?? null;
		} catch {
			return null;
		}
	}
}

export async function getPatientDocumentBinary(documentId: string): Promise<{
	document: DocumentReferenceResource;
	attachmentUrl: string | null;
	r2ObjectKey: string | null;
	checksumSha256: string | null;
	malwareStatus: MalwareStatus;
} | null> {
	const document = await getPatientDocumentReference(documentId);
	const attachmentUrl = document?.content?.[0]?.attachment?.url?.trim() ?? null;
	const r2ObjectKey = extractR2ObjectKey(attachmentUrl ?? undefined);

	if (!document) {
		return null;
	}

	return {
		document,
		attachmentUrl,
		r2ObjectKey: r2ObjectKey ?? null,
		checksumSha256: getDocumentChecksumSha256(document),
		malwareStatus: getDocumentMalwareStatus(document),
	};
}

export async function updateDocumentMalwareState(input: {
	documentId: string;
	status: MalwareStatus;
	scannedAt?: Date;
	engine?: string | null;
	signature?: string | null;
	checksumSha256?: string | null;
}): Promise<DocumentReferenceResource> {
	const medplum = await getMedplumClient();
	const document = await getPatientDocumentReference(input.documentId);

	if (!document?.id) {
		throw new Error('Document not found.');
	}

	let identifiers = upsertIdentifier(
		document.identifier,
		IDENTIFIER_SYSTEM_MALWARE_STATUS,
		input.status,
	);

	identifiers = upsertIdentifier(
		identifiers,
		IDENTIFIER_SYSTEM_MALWARE_SCANNED_AT,
		(input.scannedAt ?? new Date()).toISOString(),
	);

	if (input.engine) {
		identifiers = upsertIdentifier(identifiers, IDENTIFIER_SYSTEM_MALWARE_ENGINE, input.engine);
	}

	if (input.signature) {
		identifiers = upsertIdentifier(identifiers, IDENTIFIER_SYSTEM_MALWARE_SIGNATURE, input.signature);
	}

	if (input.checksumSha256) {
		identifiers = upsertIdentifier(
			identifiers,
			IDENTIFIER_SYSTEM_CHECKSUM_SHA256,
			input.checksumSha256.toLowerCase(),
		);
	}

	if (!input.engine) {
		identifiers = removeIdentifier(identifiers, IDENTIFIER_SYSTEM_MALWARE_ENGINE);
	}

	if (!input.signature) {
		identifiers = removeIdentifier(identifiers, IDENTIFIER_SYSTEM_MALWARE_SIGNATURE);
	}

	return (await medplum.updateResource({
		...document,
		identifier: identifiers,
		meta: {
			...(document.meta ?? {}),
			security: withMalwareSecurityCoding(document, input.status),
		},
	} as never)) as DocumentReferenceResource;
}

export async function createPatientDocument(input: CreatePatientDocumentInput): Promise<DocumentSummary> {
	const medplum = await getMedplumClient();
	const uploaded = await putPrivateMedicalObject({
		patientId: input.patientId,
		originalFilename: input.originalFilename,
		contentType: input.contentType,
		data: input.data,
	});

	// Scan at upload time so a document is never recorded as servable without a
	// verdict. A real scanner returns clean/infected; if it is unreachable the
	// verdict is scan_failed and the serving route blocks the file (fail closed).
	// The background scan job still re-checks documents on its own cadence.
	const scan = await scanMedicalDocument({
		data: input.data,
		fileName: input.originalFilename,
		contentType: input.contentType,
		checksumSha256: uploaded.checksumSha256,
	});
	const malwareStatus: MalwareStatus = scan.verdict;
	const scannedAtIso = new Date().toISOString();

	try {
		const document = (await medplum.createResource({
			resourceType: 'DocumentReference',
			status: 'current',
			identifier: [
				{
					system: 'https://anees.health/fhir/identifier/document',
					value: `${input.patientId}-${Date.now()}`,
				},
				{
					system: IDENTIFIER_SYSTEM_CHECKSUM_SHA256,
					value: uploaded.checksumSha256,
				},
				{
					system: IDENTIFIER_SYSTEM_MALWARE_STATUS,
					value: malwareStatus,
				},
				{
					system: IDENTIFIER_SYSTEM_MALWARE_SCANNED_AT,
					value: scannedAtIso,
				},
				{
					system: IDENTIFIER_SYSTEM_MALWARE_ENGINE,
					value: scan.engine,
				},
				...(scan.signature
					? [{ system: IDENTIFIER_SYSTEM_MALWARE_SIGNATURE, value: scan.signature }]
					: []),
			],
			subject: { reference: `Patient/${input.patientId}` },
			type: {
				coding: [
					{
						system: MEDPLUM_CODE_SYSTEMS.documentCategory,
						code: input.category ?? 'report',
						display: input.title,
					},
				],
				text: input.title,
			},
			category: [
				{
					coding: [
						{
							system: MEDPLUM_CODE_SYSTEMS.documentCategory,
							code: input.category ?? 'report',
							display: input.title,
						},
					],
				},
			],
			date: (input.documentDate ?? new Date()).toISOString(),
			author: input.authorReference
				? [{ reference: input.authorReference, display: input.authorDisplay ?? undefined }]
				: undefined,
			meta: {
				security: [
					{
						system: MALWARE_SECURITY_SYSTEM,
						code: malwareStatus,
						display: malwareStatus.replace('_', ' '),
					},
				],
			},
			content: [
				{
					attachment: {
						contentType: uploaded.contentType,
						title: input.originalFilename,
						url: toR2DocumentAttachmentUrl(uploaded.objectKey),
						size: uploaded.sizeBytes,
					},
				},
			],
		} as never)) as DocumentReferenceResource;

		const summary = summarizeDocument(document);
		if (!summary) {
			throw new Error('Failed to create document reference.');
		}

		return summary;
	} catch (error) {
		try {
			await deletePrivateMedicalObject(uploaded.objectKey);
		} catch {
			// Best-effort cleanup.
		}
		throw error;
	}
}

export async function deletePatientDocument(documentId: string): Promise<{
	documentId: string;
	attachmentUrl: string | null;
	r2ObjectKey: string | null;
}> {
	const medplum = await getMedplumClient();
	const document = await getPatientDocumentReference(documentId);

	if (!document?.id) {
		throw new Error('Document not found.');
	}

	const attachmentUrl = document.content?.[0]?.attachment?.url?.trim() ?? null;
	const r2ObjectKey = extractR2ObjectKey(attachmentUrl ?? undefined) ?? null;

	await medplum.deleteResource('DocumentReference', document.id);

	if (r2ObjectKey) {
		try {
			await deletePrivateMedicalObject(r2ObjectKey);
		} catch {
			// Best-effort cleanup; keep document deletion as source-of-truth outcome.
		}
	}

	return {
		documentId: document.id,
		attachmentUrl,
		r2ObjectKey,
	};
}
