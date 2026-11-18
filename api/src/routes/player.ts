import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { recordUserEvent } from '../services/eventNotifications';

const router = Router();

router.get('/profile', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', req.telegramUser!.id.toString()).single();
  if (!data) { res.status(404).json({ error: 'Player not found' }); return; }
  if (data.status === 'inactive') {
    res.status(403).json({ error: 'Your account has been deactivated.' });
    return;
  }
  res.json({ player: data });
});

// GET /api/player/invited â€” returns all users invited by the current user
router.get('/invited', validateTelegramAuth, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();

  // Fetch all users who have this user as their inviter
  const { data: invitedUsers, error } = await supabase
    .from('users')
    .select('telegram_id, first_name, username, created_at')
    .eq('inviter_id', telegramId)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!invitedUsers || invitedUsers.length === 0) {
    res.json({ invited: [], total_earned: 0 });
    return;
  }

  // For each invited user, check if they made a first approved deposit and calculate reward
  const invitedWithRewards = await Promise.all(
    invitedUsers.map(async (u: any) => {
      const { data: firstDeposit } = await supabase
        .from('deposits')
        .select('amount, created_at')
        .eq('telegram_id', u.telegram_id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const rewardEarned = firstDeposit ? firstDeposit.amount * 0.10 : 0;
      return {
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        username: u.username,
        joined_at: u.created_at,
        has_deposited: !!firstDeposit,
        first_deposit_amount: firstDeposit?.amount || 0,
        first_deposit_date: firstDeposit?.created_at || null,
        reward_earned: rewardEarned,
      };
    })
  );

  const total_earned = invitedWithRewards.reduce((sum, u) => sum + u.reward_earned, 0);
  res.json({ invited: invitedWithRewards, total_earned });
});
// Fetch support contact and channel link from settings
router.get('/support-contact', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { data: allSettings } = await supabase.from('settings').select('key, value');
  const getSetting = (k: string, def: string) => {
    const row = allSettings?.find(s => s.key === k);
    return row ? row.value : def;
  };

  res.json({
    username: getSetting('support_username', 'Choicebingosupport'),
    channel: getSetting('group_link', getSetting('channel_link', 'https://t.me/choicebingo')),
    group: getSetting('group_link', getSetting('channel_link', 'https://t.me/choicebingo')),
    announcement_message: getSetting('announcement_message', ''),
    announcement_max_views: parseInt(getSetting('announcement_max_views', '2'), 10)
  });
});

// GET /api/player/transfer/lookup â€” verify recipient before showing confirmation
router.get('/transfer/lookup', validateTelegramAuth, async (req: AuthRequest, res) => {
  const senderTelegramId = req.telegramUser!.id.toString();
  const recipient_id = (req.query.recipient_id as string || '').trim();
  if (!recipient_id) {
    res.status(400).json({ error: 'Recipient Telegram ID is required.' });
    return;
  }
  if (recipient_id === senderTelegramId) {
    res.status(400).json({ error: 'You cannot transfer to yourself.' });
    return;
  }
  const { data: recipient, error } = await supabase
    .from('users')
    .select('telegram_id, first_name, username')
    .eq('telegram_id', recipient_id)
    .maybeSingle();

  if (error || !recipient) {
    res.status(404).json({ error: 'Recipient not found. Please check the Telegram ID.' });
    return;
  }

  res.json({
    recipient_telegram_id: recipient.telegram_id,
    first_name: recipient.first_name || 'User',
    username: recipient.username || '',
  });
});

// POST /api/player/transfer â€” transfer main_balance between users
router.post('/transfer', validateTelegramAuth, async (req: AuthRequest, res) => {
  const senderTelegramId = req.telegramUser!.id.toString();
  const { recipient_telegram_id, amount } = req.body;

  if (!recipient_telegram_id || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Recipient Telegram ID and a valid amount are required.' });
    return;
  }

  if (recipient_telegram_id === senderTelegramId) {
    res.status(400).json({ error: 'You cannot transfer to yourself.' });
    return;
  }

  const transferAmount = Number(amount);

  // Fetch sender balance
  const { data: sender } = await supabase
    .from('users')
    .select('main_balance, first_name, username')
    .eq('telegram_id', senderTelegramId)
    .single();

  if (!sender) { res.status(404).json({ error: 'Sender not found.' }); return; }
  if (sender.main_balance < transferAmount) {
    res.status(400).json({ error: `Insufficient main balance. You have ${sender.main_balance} ETB.` });
    return;
  }

  // Fetch recipient
  const { data: recipient } = await supabase
    .from('users')
    .select('main_balance, first_name, username')
    .eq('telegram_id', recipient_telegram_id)
    .single();

  if (!recipient) {
    res.status(404).json({ error: 'Recipient not found. Make sure the Telegram ID is correct.' });
    return;
  }

  // Deduct from sender
  const { error: senderErr } = await supabase
    .from('users')
    .update({ main_balance: sender.main_balance - transferAmount })
    .eq('telegram_id', senderTelegramId)
    .gte('main_balance', transferAmount);

  if (senderErr) { res.status(500).json({ error: 'Failed to deduct balance. Please try again.' }); return; }

  // Add to recipient
  const { error: recipientErr } = await supabase
    .from('users')
    .update({ main_balance: recipient.main_balance + transferAmount })
    .eq('telegram_id', recipient_telegram_id);

  if (recipientErr) {
    // Rollback sender
    await supabase.from('users').update({ main_balance: sender.main_balance }).eq('telegram_id', senderTelegramId);
    res.status(500).json({ error: 'Failed to credit recipient. Transfer rolled back.' }); return;
  }

  // Notify recipient and sender via Telegram bot
  try {
    const botToken = process.env.BOT_TOKEN;
    const senderDisplay = sender.username
      ? `@${sender.username.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')}`
      : (sender.first_name || 'Someone').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
    const recipientDisplay = recipient.username
      ? `@${recipient.username.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')}`
      : (recipient.first_name || 'User').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
    
    if (botToken) {
      // Notify Recipient
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient_telegram_id,
          text: `💸 *You received a transfer!*\n\n👤 From: ${senderDisplay}\n💰 Amount: *${transferAmount.toLocaleString('en-US')} ETB*\n\n✅ Added to your Main Balance.`,
          parse_mode: 'Markdown'
        })
      });

      // Notify Sender
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: senderTelegramId,
          text: `📤 *Transfer Sent Successfully!*\n\n👤 To: ${recipientDisplay}\n💰 Amount: *${transferAmount.toLocaleString('en-US')} ETB*\n\n✅ Deducted from your Main Balance.`,
          parse_mode: 'Markdown'
        })
      });
    }

    // In-app notification for Recipient
    recordUserEvent(recipient_telegram_id, {
      id: `transfer_rcv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'transfer',
      title: `Transfer Received (+${transferAmount.toLocaleString('en-US')} ETB)`,
      title_am: `ገንዘብ ደርሶዎታል (+${transferAmount.toLocaleString('en-US')} ብር)`,
      message: `You received a transfer of ${transferAmount.toLocaleString('en-US')} ETB from ${sender.username ? '@' + sender.username : (sender.first_name || senderTelegramId)}. Added to your Main Balance.`,
      message_am: `ከ ${sender.username ? '@' + sender.username : (sender.first_name || senderTelegramId)} የ ${transferAmount.toLocaleString('en-US')} ብር ተላልፎልዎታል። ወደ ዋና ሂሳብዎ ገብቷል።`,
      amount: transferAmount,
      status: 'success',
      created_at: new Date().toISOString(),
    }).catch(console.error);

    // In-app notification for Sender
    recordUserEvent(senderTelegramId, {
      id: `transfer_sent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'transfer',
      title: `Transfer Sent (-${transferAmount.toLocaleString('en-US')} ETB)`,
      title_am: `ገንዘብ ተላልፏል (-${transferAmount.toLocaleString('en-US')} ብር)`,
      message: `You transferred ${transferAmount.toLocaleString('en-US')} ETB to ${recipient.username ? '@' + recipient.username : (recipient.first_name || recipient_telegram_id)}. Deducted from your Main Balance.`,
      message_am: `የ ${transferAmount.toLocaleString('en-US')} ብር ለ ${recipient.username ? '@' + recipient.username : (recipient.first_name || recipient_telegram_id)} አስተላልፈዋል። ከዋና ሂሳብዎ ተቀንሷል።`,
      amount: transferAmount,
      status: 'warning',
      created_at: new Date().toISOString(),
    }).catch(console.error);
  } catch (e) { console.error('Notify error:', e); }

  res.json({
    success: true,
    recipient_name: recipient.first_name || recipient.username || 'User',
    amount: transferAmount
  });
});



// Helper to check if a date matches allowed weekend bonus days (0=Sunday, 6=Saturday, etc.) in Ethiopian time
export function isWeekendBonusDay(dateInput?: string | Date, allowedDaysJson?: string): boolean {
  if (!allowedDaysJson) return false;
  try {
    const days = typeof allowedDaysJson === 'string' ? JSON.parse(allowedDaysJson) : allowedDaysJson;
    if (!Array.isArray(days) || days.length === 0) return false;
    const d = dateInput ? new Date(dateInput) : new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Addis_Ababa', weekday: 'short' });
    const dayStr = formatter.format(d);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayNum = map[dayStr] !== undefined ? map[dayStr] : d.getDay();
    return days.includes(dayNum);
  } catch {
    return false;
  }
}

// Helper to get Ethiopian date string YYYY-MM-DD
export function getEthiopianDateStr(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(d);
}

export default router;
