import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { homeRouteForRole } from '@/lib/auth/route-access';

export const dynamic = 'force-dynamic';

/**
 * Staff entry dispatcher. This is the single canonical landing for `/admin`:
 * it resolves the signed-in staff member's role and forwards them to their own
 * home section (see `homeRouteForRole`). Login and "already signed in" flows all
 * point here, so no role ever lands on another role's workspace or gets bounced
 * around. Defence in depth — `proxy.ts` already requires staff for `/admin/*`.
 */
export default async function AdminRootPage() {
  const user = await getSessionUser();

  if (!isStaff(user)) {
    redirect('/en/auth/login?callbackUrl=/admin');
  }

  redirect(homeRouteForRole(user.staffRole ?? null));
}
