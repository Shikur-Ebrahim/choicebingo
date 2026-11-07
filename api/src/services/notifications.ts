import { supabase } from './supabase';

export interface UserNotificationRecord {
  id?: string;
  telegram_id: string;
  type: 'broadcast' | 'deposit' | 'withdrawal' | 'win' | 'reward' | 'refund' | 'transfer';
  title: string;
  title_am?: string;
  message: string;
  message_am?: string;
  amount?: number;
  status: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple';
  created_at?: string;
  metadata?: any;
}

/**
 * Record a user notification.
 * 1. Tries to insert into `user_notifications` table in Supabase.
 * 2. If table doesn't exist yet, stores in `settings` under key `notif_queue_${telegram_id}` (keeps last 30).
 */
export async function recordNotification(notif: UserNotificationRecord): Promise<void> {
  const record = {
    ...notif,
    id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: notif.created_at || new Date().toISOString(),
  };

  // 1. Try writing to user_notifications table
  try {
    const { error } = await supabase.from('user_notifications').insert([record]);
    if (!error) {
      return;
    }
  } catch (err) {
    // Fall through to fallback storage
  }

  // 2. Fallback: store in `settings` table as JSON array per user
  try {
    const settingKey = `notifs_${record.telegram_id}`;
    const { data: existingRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', settingKey)
      .maybeSingle();

    let list: UserNotificationRecord[] = [];
    if (existingRow && existingRow.value) {
      try {
        list = JSON.parse(existingRow.value);
      } catch {}
    }

    // Prepend new record, keep up to 30 latest
    list.unshift(record);
    if (list.length > 30) list = list.slice(0, 30);

    await supabase.from('settings').upsert({
      key: settingKey,
      value: JSON.stringify(list),
      updated_at: new Date().toISOString(),
    });
  } catch (fallbackErr) {
    console.error('[NotificationService] Fallback storage error:', fallbackErr);
  }
}

/**
 * Fetch recorded notifications for the given user IDs (e.g. telegram_id / phone variations).
 */
export async function getUserNotifications(telegramIds: string[]): Promise<UserNotificationRecord[]> {
  const results: UserNotificationRecord[] = [];
  const seenIds = new Set<string>();

  if (!telegramIds || telegramIds.length === 0) return results;

  // 1. Try querying `user_notifications` table
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .in('telegram_id', telegramIds)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      for (const item of data) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
        }
      }
    }
  } catch {}

  // 2. Also check `settings` fallback storage for each telegram ID
  for (const tid of telegramIds) {
    try {
      const settingKey = `notifs_${tid}`;
      const { data: row } = await supabase
        .from('settings')
        .select('value')
        .eq('key', settingKey)
        .maybeSingle();

      if (row && row.value) {
        const parsed: UserNotificationRecord[] = JSON.parse(row.value);
        for (const item of parsed) {
          if (!seenIds.has(item.id || '')) {
            seenIds.add(item.id || '');
            results.push(item);
          }
        }
      }
    } catch {}
  }

  results.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return results;
}
