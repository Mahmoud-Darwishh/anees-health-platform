// Shared, runtime-free types for the visit workflow board. Kept in their own
// file so both the server view-model builder and the client board import them
// without pulling server code into the client bundle.

export type VisitFilterKey = 'open' | 'inProgress' | 'upcoming' | 'last7' | 'past' | 'all';

export type VisitTone = 'ok' | 'active' | 'danger' | 'muted';

export type VisitVM = {
  id: string;
  code: string;
  metaLine: string;
  stateLabel: string;
  tone: VisitTone;
  scheduledMs: number;
  providerName: string;
  dateLabel: string;
  timeLabel: string;
  dayKey: string;
  dayHeading: string;
  statusRank: number;
  searchText: string;
  steps: { key: string; label: string; time: string | null }[];
  geoChips: string[];
  recent: string[];
  flags: {
    acknowledged: boolean;
    enRoute: boolean;
    arrived: boolean;
    checkedIn: boolean;
    checkedOut: boolean;
    closed: boolean;
  };
  filters: {
    open: boolean;
    inProgress: boolean;
    upcoming: boolean;
    last7: boolean;
    past: boolean;
  };
};
