import { describe, it, expect } from 'vitest';
import { resolveDrugTerminology, toScreenDrug, searchDrugFormulary } from '@/features/ehr/catalogs/drug-formulary';
import { resolveAllergenTerminology, toScreenAllergy } from '@/features/ehr/catalogs/allergen-catalog';

/**
 * The coded catalogs back the safety engine. These `server-only` modules are
 * pure data + lookups (no I/O), so they run under the test stub.
 */
describe('drug formulary', () => {
  it('resolves a drug to RxNorm + its safety classes', async () => {
    const amox = await resolveDrugTerminology({ label: 'Amoxicillin' });
    expect(amox?.rxnorm).toBe('723');
    expect(amox?.classes).toEqual(expect.arrayContaining(['penicillin', 'beta_lactam']));
    expect(amox?.codings.some((c) => c.system.includes('rxnorm'))).toBe(true);
  });

  it('flags controlled substances and resolves brand aliases', async () => {
    const oxy = await resolveDrugTerminology({ label: 'Oxycodone' });
    expect(oxy?.schedule).toBe('CII');
    const ventolin = await resolveDrugTerminology({ label: 'ventolin' });
    expect(ventolin?.canonicalLabel).toBe('Salbutamol');
  });

  it('reduces to a screen-drug and searches', async () => {
    const screen = await toScreenDrug('Warfarin', '11289');
    expect(screen?.classes).toContain('anticoagulant');
    expect((await searchDrugFormulary('amox')).length).toBeGreaterThan(0);
    expect(await resolveDrugTerminology({ label: 'unobtainium' })).toBeNull();
  });
});

describe('allergen catalog', () => {
  it('resolves an allergen to category + cross-reactivity classes', async () => {
    const pen = await resolveAllergenTerminology({ label: 'Penicillin' });
    expect(pen?.category).toBe('medication');
    expect(pen?.reactiveClasses.map((r) => r.class)).toEqual(expect.arrayContaining(['penicillin', 'beta_lactam']));

    const screen = await toScreenAllergy('Penicillin');
    expect(screen?.reactiveClasses.some((r) => r.class === 'penicillin' && r.severity === 'contraindicated')).toBe(true);
  });

  it('returns null for an unmatched free-text allergen', async () => {
    expect(await resolveAllergenTerminology({ label: 'made-up-allergen' })).toBeNull();
    expect(await toScreenAllergy('made-up-allergen')).toBeNull();
  });
});
