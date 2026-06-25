'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { completeDoctorTaskAction } from './actions';
import type { DoctorTaskItem } from './data';

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

type Filter = 'open' | 'urgent' | 'overdue';

function priorityBadge(priority: DoctorTaskItem['priority']): string {
  if (priority === 'stat' || priority === 'asap') return 'text-bg-danger';
  if (priority === 'urgent') return 'text-bg-warning';
  return 'text-bg-light border';
}

function isUrgent(task: DoctorTaskItem): boolean {
  return task.priority === 'urgent' || task.priority === 'asap' || task.priority === 'stat';
}

/** Contextual one-tap label: co-sign for co-sign tasks, acknowledge for escalations. */
function actionLabel(code: string | null): string {
  if (code === 'co-sign') return 'Co-sign';
  if (code === 'escalation') return 'Acknowledge';
  return 'Mark done';
}

export function DoctorTaskQueue({
  tasks,
  openCount,
  urgentCount,
  overdueCount,
}: {
  tasks: DoctorTaskItem[];
  openCount: number;
  urgentCount: number;
  overdueCount: number;
}) {
  const [filter, setFilter] = useState<Filter>('open');

  const visible = useMemo(() => {
    if (filter === 'urgent') return tasks.filter(isUrgent);
    if (filter === 'overdue') return tasks.filter((task) => task.isOverdue);
    return tasks;
  }, [tasks, filter]);

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'open', label: 'Open', count: openCount },
    { key: 'urgent', label: 'Urgent', count: urgentCount },
    { key: 'overdue', label: 'Overdue', count: overdueCount },
  ];

  return (
    <section>
      <div className="clinician-stats-grid mb-3" role="group" aria-label="Filter tasks">
        {chips.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className="clinician-stat-card text-start"
              aria-pressed={active}
              style={{
                cursor: 'pointer',
                border: active ? '2px solid var(--color-primary)' : undefined,
              }}
            >
              <span className="clinician-stat-label d-block mb-1">{chip.label}</span>
              <span className="clinician-stat-value mb-0">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <h3 className="h6 mt-2">Needs my action</h3>
      {visible.length === 0 ? (
        <div className="alert alert-light border">
          {filter === 'open' ? 'No open tasks assigned to you.' : `No ${filter} tasks right now.`}
        </div>
      ) : (
        <div className="clinician-visit-list mb-3">
          {visible.map((task) => (
            <article key={task.id} className="clinician-visit-card">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <h4 className="h6 mb-1">{task.title}</h4>
                <span className={`badge ${priorityBadge(task.priority)} text-capitalize`}>{task.priority ?? 'routine'}</span>
              </div>
              {task.description ? <p className="small text-muted mb-1">{task.description}</p> : null}
              <p className="small text-muted mb-2">
                {task.dueAtIso ? `Due ${dateTimeFmt.format(new Date(task.dueAtIso))}` : 'No due date'}
                {task.isOverdue ? ' · overdue' : ''}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <form action={completeDoctorTaskAction}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button type="submit" className="btn btn-sm btn-primary">
                    {actionLabel(task.code)}
                  </button>
                </form>
                {task.patientMedplumId ? (
                  <Link href={`/admin/patients/${task.patientMedplumId}`} className="btn btn-sm btn-outline-secondary">
                    Open chart
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
