import { Notification } from '@/types';

/** Map API payloads to UI shape and drop invalid rows so filters/cards never see null dates or ids. */
export function normalizeNotificationItem(raw: unknown): Notification | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.id ?? r._id;
  const createdAt = r.createdAt ?? r.created_at ?? r.date;
  if (id == null || createdAt == null) return null;
  const idStr = String(id);
  const dateStr = String(createdAt);
  if (!idStr || !dateStr) return null;
  if (Number.isNaN(Date.parse(dateStr))) return null;

  const title =
    typeof r.title === 'string'
      ? r.title
      : typeof r.subject === 'string'
        ? r.subject
        : 'Notification';
  const message =
    typeof r.message === 'string'
      ? r.message
      : typeof r.body === 'string'
        ? r.body
        : typeof r.content === 'string'
          ? r.content
          : '';

  const rawType = String(r.type ?? 'alert').toLowerCase();
  const type: Notification['type'] =
    rawType === 'task' ||
    rawType === 'announcement' ||
    rawType === 'reminder' ||
    rawType === 'alert'
      ? rawType
      : 'alert';

  const isRead = Boolean(r.isRead ?? r.read ?? r.is_read);

  return {
    id: idStr,
    title,
    message,
    type,
    isRead,
    createdAt: dateStr,
    relatedTaskId:
      typeof r.relatedTaskId === 'string'
        ? r.relatedTaskId
        : typeof r.related_task_id === 'string'
          ? r.related_task_id
          : undefined,
  };
}

export function normalizeNotificationsList(data: unknown): Notification[] {
  if (!Array.isArray(data)) return [];
  const out: Notification[] = [];
  for (const item of data) {
    const n = normalizeNotificationItem(item);
    if (n) out.push(n);
  }
  return out;
}
