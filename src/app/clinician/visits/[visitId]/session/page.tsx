import { getPhysioSessionWorkspaceData, type RankingWindow } from '@/features/ehr/clinician-physio/session-workspace/data';
import { SessionWorkspacePageView } from '@/features/ehr/clinician-physio/session-workspace/SessionWorkspacePageView';

export default async function ClinicianSessionWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ window?: string }>;
}) {
  const { visitId } = await params;
  const { window } = await searchParams;

  const rankingWindow: RankingWindow =
    window === '7d' || window === '30d' || window === 'all' ? window : 'all';

  const data = await getPhysioSessionWorkspaceData(visitId, rankingWindow);
  return <SessionWorkspacePageView data={data} />;
}
