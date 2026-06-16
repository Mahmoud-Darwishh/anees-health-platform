'use client';

import { useMemo, useState } from 'react';
import { VisitCard, VisitRow } from './visit-cards';
import type { VisitFilterKey, VisitVM } from './visit-types';

type ViewMode = 'cards' | 'compact' | 'agenda';
type SortKey = 'date' | 'status' | 'clinician';
type SortDir = 'asc' | 'desc';

const FILTER_DEFS: { key: VisitFilterKey; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

const FILTER_CAPTIONS: Record<VisitFilterKey, string> = {
  open: 'Open = any visit not yet completed or cancelled — the ones that still need action.',
  inProgress: 'In progress = checked in but not yet checked out (happening right now).',
  upcoming: 'Upcoming = open visits scheduled today or later.',
  last7: 'Last 7 days = visits scheduled within the past week.',
  past: 'Past = completed, cancelled, or scheduled before today.',
  all: 'All visits for this patient.',
};

const VIEW_DEFS: { key: ViewMode; label: string }[] = [
  { key: 'cards', label: 'Cards' },
  { key: 'compact', label: 'Compact' },
  { key: 'agenda', label: 'Agenda' },
];

function matchesFilter(visit: VisitVM, filter: VisitFilterKey): boolean {
  return filter === 'all' ? true : visit.filters[filter];
}

export function VisitBoard({ visits, medplumPatientId }: { visits: VisitVM[]; medplumPatientId: string }) {
  const [filter, setFilter] = useState<VisitFilterKey>('open');
  const [view, setView] = useState<ViewMode>('cards');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const result: Record<VisitFilterKey, number> = { open: 0, inProgress: 0, upcoming: 0, last7: 0, past: 0, all: visits.length };
    for (const visit of visits) {
      if (visit.filters.open) result.open += 1;
      if (visit.filters.inProgress) result.inProgress += 1;
      if (visit.filters.upcoming) result.upcoming += 1;
      if (visit.filters.last7) result.last7 += 1;
      if (visit.filters.past) result.past += 1;
    }
    return result;
  }, [visits]);

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = visits.filter((visit) => matchesFilter(visit, filter) && (q === '' || visit.searchText.includes(q)));
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      let primary = 0;
      if (sortKey === 'date') primary = a.scheduledMs - b.scheduledMs;
      else if (sortKey === 'status') primary = a.statusRank - b.statusRank;
      else primary = a.providerName.localeCompare(b.providerName);
      if (primary !== 0) return primary * dir;
      return (a.scheduledMs - b.scheduledMs) * dir;
    });
  }, [visits, filter, query, sortKey, sortDir]);

  const agendaGroups = useMemo(() => {
    if (view !== 'agenda') return [];
    const groups: { key: string; heading: string; items: VisitVM[] }[] = [];
    const index = new Map<string, number>();
    for (const visit of processed) {
      let position = index.get(visit.dayKey);
      if (position === undefined) {
        position = groups.length;
        index.set(visit.dayKey, position);
        groups.push({ key: visit.dayKey, heading: visit.dayHeading, items: [] });
      }
      groups[position].items.push(visit);
    }
    return groups;
  }, [processed, view]);

  function toggleRow(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="anees-visit-board">
      <div className="anees-visit-toolbar">
        <div className="anees-visit-viewswitch" role="tablist" aria-label="View mode">
          {VIEW_DEFS.map((def) => (
            <button
              key={def.key}
              type="button"
              role="tab"
              aria-selected={view === def.key}
              className={`anees-visit-viewbtn ${view === def.key ? 'is-active' : ''}`}
              onClick={() => setView(def.key)}
            >
              {def.label}
            </button>
          ))}
        </div>

        <div className="anees-visit-tools">
          <input
            type="search"
            className="form-control form-control-sm anees-visit-search"
            placeholder="Search code or clinician"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search visits"
          />
          <select
            className="form-select form-select-sm anees-visit-sort"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="Sort visits by"
          >
            <option value="date">Sort: Date</option>
            <option value="status">Sort: Status</option>
            <option value="clinician">Sort: Clinician</option>
          </select>
          <button
            type="button"
            className="anees-visit-sortdir"
            onClick={() => setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))}
            aria-label={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="anees-visit-filters" role="tablist" aria-label="Filter visits">
        {FILTER_DEFS.map((def) => (
          <button
            key={def.key}
            type="button"
            role="tab"
            aria-selected={filter === def.key}
            className={`anees-visit-filter ${filter === def.key ? 'is-active' : ''}`}
            onClick={() => setFilter(def.key)}
            title={FILTER_CAPTIONS[def.key]}
          >
            {def.label}
            <span className="anees-visit-filter-count">{counts[def.key]}</span>
          </button>
        ))}
      </div>

      {processed.length === 0 ? (
        <div className="alert alert-info mb-0" role="alert">No visits match this filter or search.</div>
      ) : view === 'cards' ? (
        <div className="anees-visit-list">
          {processed.map((visit) => (
            <VisitCard key={visit.id} visit={visit} medplumPatientId={medplumPatientId} />
          ))}
        </div>
      ) : view === 'compact' ? (
        <div className="anees-visit-rows">
          {processed.map((visit) => (
            <VisitRow
              key={visit.id}
              visit={visit}
              medplumPatientId={medplumPatientId}
              expanded={expanded.has(visit.id)}
              onToggle={() => toggleRow(visit.id)}
            />
          ))}
        </div>
      ) : (
        <div className="anees-visit-agenda">
          {agendaGroups.map((group) => (
            <section key={group.key} className="anees-visit-agenda-group">
              <h3 className="anees-visit-agenda-heading">{group.heading}</h3>
              <div className="anees-visit-rows">
                {group.items.map((visit) => (
                  <VisitRow
                    key={visit.id}
                    visit={visit}
                    medplumPatientId={medplumPatientId}
                    expanded={expanded.has(visit.id)}
                    onToggle={() => toggleRow(visit.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
