import { describe, it, expect } from 'vitest';
import { canAccessRoute, homeRouteForRole, rolesForRoute } from '@/lib/auth/route-access';

/**
 * The coarse edge gate. Pins which roles may ENTER each section, aligned to the
 * role matrix (compliance reads charts; viewer/hospital-partner are deferred).
 */
describe('canAccessRoute (edge section gate)', () => {
  it('admits clinical roles + compliance to the patient chart, not back-office/deferred roles', () => {
    for (const role of ['doctor', 'nurse', 'physiotherapist', 'medical_ops', 'admin', 'superadmin', 'compliance_officer'] as const) {
      expect(canAccessRoute('/admin/patients', role)).toBe(true);
    }
    for (const role of ['insurance_coordinator', 'finance', 'viewer', 'hospital_partner_admin'] as const) {
      expect(canAccessRoute('/admin/patients', role)).toBe(false);
    }
  });

  it('opens the clinician workspace to physio + nurse + doctor (+ admins), not back-office roles', () => {
    expect(canAccessRoute('/clinician/today', 'physiotherapist')).toBe(true);
    expect(canAccessRoute('/clinician/today', 'admin')).toBe(true);
    // Nurses + doctors each have a discipline workspace under /clinician/*.
    expect(canAccessRoute('/clinician/nursing/today', 'nurse')).toBe(true);
    expect(canAccessRoute('/clinician/doctor', 'doctor')).toBe(true);
    expect(canAccessRoute('/clinician/today', 'nurse')).toBe(true);
    expect(canAccessRoute('/clinician/today', 'doctor')).toBe(true);
    // Back-office roles still have no clinician workspace.
    expect(canAccessRoute('/clinician/today', 'insurance_coordinator')).toBe(false);
  });

  it('scopes the section dashboards to their owning roles', () => {
    expect(canAccessRoute('/admin/compliance', 'compliance_officer')).toBe(true);
    expect(canAccessRoute('/admin/compliance', 'nurse')).toBe(false);
    expect(canAccessRoute('/admin/insurance', 'finance')).toBe(true);
    expect(canAccessRoute('/admin/insurance', 'insurance_coordinator')).toBe(true);
    expect(canAccessRoute('/admin/ops', 'operator')).toBe(true);
    expect(canAccessRoute('/admin/nursing/dashboard', 'nurse')).toBe(true);
  });

  it('lets every authenticated staff member see their own access page', () => {
    for (const role of ['viewer', 'hospital_partner_admin', 'finance', 'nurse'] as const) {
      expect(canAccessRoute('/admin/access', role)).toBe(true);
    }
  });

  it('denies by default for an unlisted route', () => {
    expect(rolesForRoute('/admin/totally-new-section')).toEqual([]);
    expect(canAccessRoute('/admin/totally-new-section', 'superadmin')).toBe(false);
  });

  it('routes each role to a reachable home', () => {
    expect(homeRouteForRole('physiotherapist')).toBe('/clinician/today');
    expect(homeRouteForRole('nurse')).toBe('/clinician/nursing/today');
    expect(homeRouteForRole('compliance_officer')).toBe('/admin/compliance');
    expect(homeRouteForRole('viewer')).toBe('/admin/no-workspace');
    expect(homeRouteForRole(null)).toBe('/en');
  });
});
