import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { getStaffMember, listDoctorOptions } from '@/features/admin/staff/data';
import { updateStaffAction } from '@/features/admin/staff/actions';
import { StaffForm, type StaffFormInitial } from '@/features/admin/staff/StaffForm';
import { StaffAccessControls } from '@/features/admin/staff/StaffAccessControls';
import { ROLE_LABELS } from '@/features/admin/staff/labels';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ staffId: string }> };

export default async function ManageStaffPage({ params }: Props) {
  const { staffId } = await params;
  const user = await getStaffUser(['superadmin', 'admin']);
  if (!user) {
    redirect(`/admin/login?callbackUrl=/admin/staff/${staffId}`);
  }

  const tenantId = user.tenantId ?? 'platform';
  const [member, doctorOptions] = await Promise.all([getStaffMember(staffId, tenantId), listDoctorOptions()]);
  if (!member) {
    notFound();
  }

  const initial: StaffFormInitial = {
    staffId: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    clinicalLicenseType: member.clinicalLicenseType ?? '',
    clinicalLicenseNumber: member.clinicalLicenseNumber ?? '',
    clinicalLicenseExpiry: member.clinicalLicenseExpiry ? member.clinicalLicenseExpiry.toISOString().slice(0, 10) : '',
    licenseIssuingBody: member.licenseIssuingBody ?? '',
    isOnCall: member.isOnCall,
    isClinicalDirector: member.isClinicalDirector,
    publicDoctorId: member.publicDoctorId ? String(member.publicDoctorId) : '',
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <p className="mb-1 small opacity-75">
          <Link href="/admin/staff" className="text-white text-decoration-underline">Staff</Link> · Manage
        </p>
        <h1 className="h5 mb-0">{member.name} · {ROLE_LABELS[member.role]}</h1>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Profile, role &amp; licence</h2>
          <StaffForm mode="edit" action={updateStaffAction} initial={initial} doctorOptions={doctorOptions} />
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <StaffAccessControls staffId={member.id} currentStatus={member.status} isSelf={member.id === user.staffId} />
        </div>
      </div>
    </div>
  );
}
