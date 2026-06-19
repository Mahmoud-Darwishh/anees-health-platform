import { describe, it, expect } from 'vitest';
import { screenMedication, requiresAcknowledgement, summarizeAlerts } from '@/lib/ehr/medication-safety';
import { resolveLabAnalyte, interpretLabValue, searchLabAnalytes } from '@/features/ehr/catalogs/lab-analytes';
import { scoreAssessment, getInstrument, listInstruments } from '@/features/ehr/catalogs/assessment-instruments';

describe('medication safety engine', () => {
  it('flags a drug–allergy contraindication (penicillin allergy + amoxicillin)', () => {
    const alerts = screenMedication({
      candidate: { label: 'Amoxicillin', ingredients: ['amoxicillin'], classes: ['penicillin', 'beta_lactam'] },
      currentMedications: [],
      allergies: [{ label: 'Penicillin', reactiveClasses: [{ class: 'penicillin', severity: 'contraindicated' }] }],
    });
    expect(alerts.some((a) => a.kind === 'drug-allergy' && a.severity === 'contraindicated')).toBe(true);
    expect(requiresAcknowledgement(alerts)).toBe(true);
    expect(summarizeAlerts(alerts)).toContain('CONTRAINDICATED');
  });

  it('flags a drug–drug contraindication (warfarin + NSAID) and opioid + benzodiazepine', () => {
    const a = screenMedication({
      candidate: { label: 'Ibuprofen', ingredients: ['ibuprofen'], classes: ['nsaid'] },
      currentMedications: [{ label: 'Warfarin', ingredients: ['warfarin'], classes: ['anticoagulant'] }],
      allergies: [],
    });
    expect(a.some((x) => x.kind === 'drug-drug' && x.severity === 'contraindicated')).toBe(true);

    const b = screenMedication({
      candidate: { label: 'Tramadol', ingredients: ['tramadol'], classes: ['opioid', 'serotonergic'] },
      currentMedications: [{ label: 'Diazepam', ingredients: ['diazepam'], classes: ['benzodiazepine'] }],
      allergies: [],
    });
    expect(b.some((x) => x.severity === 'contraindicated')).toBe(true);
  });

  it('detects duplicate therapy and returns nothing for a clean pairing', () => {
    const dup = screenMedication({
      candidate: { label: 'Naproxen', ingredients: ['naproxen'], classes: ['nsaid'] },
      currentMedications: [{ label: 'Ibuprofen', ingredients: ['ibuprofen'], classes: ['nsaid'] }],
      allergies: [],
    });
    expect(dup.some((x) => x.kind === 'duplicate-therapy')).toBe(true);

    const clean = screenMedication({
      candidate: { label: 'Paracetamol', ingredients: ['paracetamol'], classes: ['analgesic'] },
      currentMedications: [{ label: 'Amlodipine', ingredients: ['amlodipine'], classes: ['calcium_channel_blocker'] }],
      allergies: [],
    });
    expect(clean).toHaveLength(0);
    expect(requiresAcknowledgement(clean)).toBe(false);
  });
});

describe('lab analyte catalog', () => {
  it('flags values against the reference range with correct LOINC', () => {
    const k = resolveLabAnalyte({ label: 'Potassium' });
    expect(k?.loinc).toBe('2823-3');
    expect(interpretLabValue(k!, 6.0)).toBe('H');
    expect(interpretLabValue(k!, 4.0)).toBe('N');

    const hgb = resolveLabAnalyte({ label: 'Hemoglobin' });
    expect(interpretLabValue(hgb!, 9)).toBe('L');
  });

  it('resolves by alias and searches', () => {
    expect(resolveLabAnalyte({ label: 'k' })?.key).toBe('potassium');
    expect(searchLabAnalytes('sodium').length).toBeGreaterThan(0);
    expect(resolveLabAnalyte({ label: 'not-a-real-analyte' })).toBeNull();
  });
});

describe('validated assessment instruments', () => {
  it('scores + bands within range and rejects out-of-range', () => {
    expect(scoreAssessment('braden', 8)).toMatchObject({ valid: true, band: { severity: 'high' } });
    expect(scoreAssessment('braden', 20).band?.severity).toBe('low');
    expect(scoreAssessment('braden', 30).valid).toBe(false);

    expect(scoreAssessment('berg', 15).band?.label).toBe('High fall risk');
    expect(scoreAssessment('nprs', 9).band?.severity).toBe('high');
    expect(scoreAssessment('unknown-tool', 5).valid).toBe(false);
  });

  it('exposes a catalog with LOINC where defined', () => {
    expect(getInstrument('braden')?.loinc).toBe('38228-2');
    expect(listInstruments().length).toBeGreaterThanOrEqual(6);
  });
});
