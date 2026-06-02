import { api } from '../lib/apiClient';
import type { ActivityHistoryItem } from '../components/listing/ActivityHistoryList';

export async function fetchProposalTimeline(proposalId: string): Promise<ActivityHistoryItem[]> {
  const data = await api.get<{ activities: ActivityHistoryItem[] }>(
    `/api/propostas/${proposalId}/timeline`,
  );
  return data.activities ?? [];
}
