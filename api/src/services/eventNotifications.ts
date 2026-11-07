import { supabase } from './supabase';

export interface UserNotificationEvent {
  id: string;
  type: 'refund' | 'transfer';
  title: string;
  title_am?: string;
  message: string;
  message_am?: string;
  amount?: number;
  status: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple';
  created_at: string;
}

/**
 * Record a user notification event (such as Game Cancel Refund or Transfer)
 * into the existing `settings` table without creating any new tables.
 */
export async function recordUserEvent(telegramId: string, event: UserNotificationEvent): Promise<void> {
  if (!telegramId) return;

  try {
    const key = `user_events_${telegramId}`;
    const { data: row } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    let list: UserNotificationEvent[] = [];
    if (row && row.value) {
      try {
        list = JSON.parse(row.value);
      } catch {}
    }

    // Prepend new event and keep latest 30 events
    list.unshift(event);
    if (list.length > 30) list = list.slice(0, 30);

    await supabase.from('settings').upsert({
      key,
      value: JSON.stringify(list),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[recordUserEvent] Error recording event:', err);
  }
}

/**
 * Fetch recorded events for the given user IDs (e.g. telegram_id / phone variations)
 * from the existing `settings` table.
 */
export async function getUserEvents(telegramIds: string[]): Promise<UserNotificationEvent[]> {
  const results: UserNotificationEvent[] = [];
  const seenIds = new Set<string>();

  if (!telegramIds || telegramIds.length === 0) return results;

  try {
    const keys = telegramIds.map(tid => `user_events_${tid}`);
    const { data: rows, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', keys);

    if (!error && rows) {
      for (const row of rows) {
        if (row && row.value) {
          try {
            const list: UserNotificationEvent[] = JSON.parse(row.value);
            for (const item of list) {
              if (item && item.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                results.push(item);
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('[getUserEvents] Error fetching user events:', err);
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return results;
}
