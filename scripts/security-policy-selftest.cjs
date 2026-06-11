/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (request === 'server-only') {
    return path.resolve(__dirname, 'server-only-stub.js');
  }

  if (request.startsWith('@/')) {
    const sourcePath = path.resolve(__dirname, '..', 'src', request.slice(2));
    return originalResolveFilename.call(this, sourcePath, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { canSignClinical } = require('../src/lib/auth/rbac');
const { can } = require('../src/lib/auth/policy/can');

function actor(role, tenantId = 'platform') {
  return {
    kind: 'staff',
    staffId: `${role}-1`,
    role,
    tenantId,
    license: {
      staffRole: role,
      clinicalLicenseType:
        role === 'doctor'
          ? 'medical_syndicate'
          : role === 'nurse'
            ? 'nursing_syndicate'
            : role === 'physiotherapist'
              ? 'physiotherapy_syndicate'
              : 'none',
      clinicalLicenseNumber: role === 'admin' || role === 'finance' ? null : 'LIC-001',
      clinicalLicenseExpiry: new Date('2099-01-01T00:00:00.000Z'),
    },
  };
}

function run() {
  assert.equal(
    canSignClinical(
      {
        staffRole: 'doctor',
        clinicalLicenseType: 'medical_syndicate',
        clinicalLicenseNumber: 'MD-1',
        clinicalLicenseExpiry: new Date('2099-01-01T00:00:00.000Z'),
      },
      'medical',
    ),
    true,
    'doctor with valid medical license must sign medical discipline',
  );

  assert.equal(
    canSignClinical(
      {
        staffRole: 'doctor',
        clinicalLicenseType: 'medical_syndicate',
        clinicalLicenseNumber: 'MD-1',
        clinicalLicenseExpiry: new Date('2099-01-01T00:00:00.000Z'),
      },
      'nursing',
    ),
    false,
    'doctor must not sign nursing discipline',
  );

  assert.equal(
    canSignClinical(
      {
        staffRole: 'finance',
        clinicalLicenseType: 'medical_syndicate',
        clinicalLicenseNumber: 'FIN-1',
        clinicalLicenseExpiry: new Date('2099-01-01T00:00:00.000Z'),
      },
      'medical',
    ),
    false,
    'finance can never sign clinical discipline',
  );

  const tenantMismatch = can(actor('doctor', 'tenant-a'), 'patient.read', {
    targetTenantId: 'tenant-b',
    inCaseScope: true,
  });
  assert.equal(tenantMismatch.allow, false, 'tenant mismatch must be denied');
  assert.equal(tenantMismatch.reason, 'tenant_mismatch', 'tenant mismatch denial reason must be explicit');

  const outOfCaseScope = can(actor('physiotherapist'), 'visit.check_in', {
    targetTenantId: 'platform',
    inCaseScope: false,
  });
  assert.equal(outOfCaseScope.allow, false, 'case-scoped role must be denied out of case scope');
  assert.equal(outOfCaseScope.reason, 'out_of_case_scope', 'case scope denial reason must be explicit');

  const complianceBreakGlass = can(actor('compliance_officer'), 'break_glass.approve', {
    targetTenantId: 'platform',
  });
  assert.equal(complianceBreakGlass.allow, true, 'compliance officer should approve break-glass tokens');

  const adminBreakGlass = can(actor('admin'), 'break_glass.approve', {
    targetTenantId: 'platform',
  });
  assert.equal(adminBreakGlass.allow, true, 'admin should approve break-glass tokens');

  const nurseBreakGlass = can(actor('nurse'), 'break_glass.approve', {
    targetTenantId: 'platform',
    inCaseScope: true,
  });
  assert.equal(nurseBreakGlass.allow, false, 'nurse should not approve break-glass tokens');
  assert.equal(nurseBreakGlass.reason, 'role_not_permitted', 'approval denial reason must be role_not_permitted');

  console.log('security-policy-selftest: all checks passed');
}

run();
