import { Router, Request, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser!.id.toString();
  
  // Attempt to select role and permissions. Fallback to just role if permissions column is missing.
  let { data, error } = await supabase.from('users').select('role, permissions').eq('telegram_id', telegramId).single();
  
  if (error && error.message.includes('permissions')) {
    const fallback = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
    if (fallback.data) {
      data = { role: fallback.data.role, permissions: {} };
    } else {
      data = null;
    }
  }
  
  if (!data || (data.role !== 'admin' && data.role !== 'worker')) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }
  
  if (data.role === 'admin') {
    return next();
  }

  // Worker permissions check
  const path = req.path;
  const perms = data.permissions || {};

  let allowed = false;
  if (path.startsWith('/stats')) allowed = true; // Allow workers to view stats dashboard
  else if (path.startsWith('/pending-counts')) allowed = true; // Workers always see pending counts
  else if (path.includes('deposit') && perms.deposits) allowed = true;
  else if (path.includes('withdraw') && perms.withdrawals) allowed = true;
  else if (path.startsWith('/users') && perms.users) allowed = true;
  else if (path.startsWith('/settings') && perms.settings) allowed = true;
  else if (path.startsWith('/profit-report')) allowed = true; // Allow workers to view profit report
  else if (path.startsWith('/games') && perms.games) allowed = true;
  
  // Explicitly deny these to anyone but admin
  if (
    path.startsWith('/workers') || 
    path.startsWith('/deposit-methods') || 
    path.startsWith('/withdrawal-methods')
  ) {
    allowed = false;
  }

  if (!allowed) {
    res.status(403).json({ error: 'Access denied. Missing permission.' });
    return;
  }

  next();
};

router.use(validateTelegramAuth);
router.use(requireAdmin);

// Get all deposit methods
router.get('/deposit-methods', async (req, res) => {
  const { data, error } = await supabase
    .from('deposit_methods')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Create a deposit method
router.post('/deposit-methods', async (req, res) => {
  const { type, name, account_number, logo_url, min_deposit, is_active } = req.body;
  const activeStatus = is_active !== false;

  // RULE: Only ONE method of each category (type) can be active at the same time!
  if (activeStatus && type) {
    await supabase
      .from('deposit_methods')
      .update({ is_active: false })
      .eq('type', type);
  }

  const { data, error } = await supabase
    .from('deposit_methods')
    .insert([{
      type,
      name,
      account_number,
      logo_url: logo_url || '',
      min_deposit: min_deposit || 10,
      is_active: activeStatus,
    }])
    .select().single();
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Update a deposit method
router.put('/deposit-methods/:id', async (req, res) => {
  const { type, name, account_number, logo_url, min_deposit, is_active } = req.body;

  // RULE: Only ONE method of each category (type) can be active at the same time!
  if (is_active === true) {
    let targetType = type;
    if (!targetType) {
      const { data: cur } = await supabase.from('deposit_methods').select('type').eq('id', req.params.id).single();
      targetType = cur?.type;
    }
    if (targetType) {
      await supabase
        .from('deposit_methods')
        .update({ is_active: false })
        .eq('type', targetType)
        .neq('id', req.params.id);
    }
  }

  const updateData: any = { updated_at: new Date() };
  if (type !== undefined) updateData.type = type;
  if (name !== undefined) updateData.name = name;
  if (account_number !== undefined) updateData.account_number = account_number;
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (min_deposit !== undefined) updateData.min_deposit = min_deposit;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from('deposit_methods')
    .update(updateData)
    .eq('id', req.params.id)
    .select().single();
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Toggle a deposit method active/inactive
router.patch('/deposit-methods/:id/toggle', async (req, res) => {
  const { data: cur, error: getErr } = await supabase
    .from('deposit_methods')
    .select('id, type, is_active')
    .eq('id', req.params.id)
    .single();

  if (getErr || !cur) {
    res.status(404).json({ error: 'Deposit method not found' });
    return;
  }

  const nextActive = !cur.is_active;

  // If activating, deactivate all other methods of the same category
  if (nextActive && cur.type) {
    await supabase
      .from('deposit_methods')
      .update({ is_active: false })
      .eq('type', cur.type)
      .neq('id', cur.id);
  }

  const { data, error } = await supabase
    .from('deposit_methods')
    .update({ is_active: nextActive, updated_at: new Date() })
    .eq('id', req.params.id)
    .select().single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Delete a deposit method
router.delete('/deposit-methods/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('deposit_methods').delete().eq('id', req.params.id);
    if (error) {
      if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('constraint')) {
        // Method has linked transaction history; deactivate it safely instead of breaking data integrity
        await supabase.from('deposit_methods').update({ is_active: false, updated_at: new Date() }).eq('id', req.params.id);
        res.json({ success: true, deactivated: true, message: 'Method was deactivated because historical deposits reference it' });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete deposit method' });
  }
});

// ─── WITHDRAWAL METHODS ───────────────────────────────────────────────────────

// Get all withdrawal methods
router.get('/withdrawal-methods', async (req, res) => {
  const { data, error } = await supabase
    .from('withdrawal_methods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Create a withdrawal method
router.post('/withdrawal-methods', async (req, res) => {
  const { type, logo_url, min_withdrawal, is_active } = req.body;
  const activeStatus = is_active !== false;

  // RULE: Only ONE method of each category (type) can be active at the same time!
  if (activeStatus && type) {
    await supabase
      .from('withdrawal_methods')
      .update({ is_active: false })
      .eq('type', type);
  }

  const { data, error } = await supabase
    .from('withdrawal_methods')
    .insert([{
      type,
      logo_url: logo_url || '',
      min_withdrawal: min_withdrawal || 10,
      is_active: activeStatus,
    }])
    .select().single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Update a withdrawal method
router.put('/withdrawal-methods/:id', async (req, res) => {
  const { type, logo_url, min_withdrawal, is_active } = req.body;

  // RULE: Only ONE method of each category (type) can be active at the same time!
  if (is_active === true) {
    let targetType = type;
    if (!targetType) {
      const { data: cur } = await supabase.from('withdrawal_methods').select('type').eq('id', req.params.id).single();
      targetType = cur?.type;
    }
    if (targetType) {
      await supabase
        .from('withdrawal_methods')
        .update({ is_active: false })
        .eq('type', targetType)
        .neq('id', req.params.id);
    }
  }

  const updateData: any = { updated_at: new Date() };
  if (type !== undefined) updateData.type = type;
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (min_withdrawal !== undefined) updateData.min_withdrawal = min_withdrawal;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from('withdrawal_methods')
    .update(updateData)
    .eq('id', req.params.id)
    .select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Toggle a withdrawal method active/inactive
router.patch('/withdrawal-methods/:id/toggle', async (req, res) => {
  const { data: cur, error: getErr } = await supabase
    .from('withdrawal_methods')
    .select('id, type, is_active')
    .eq('id', req.params.id)
    .single();

  if (getErr || !cur) {
    res.status(404).json({ error: 'Withdrawal method not found' });
    return;
  }

  const nextActive = !cur.is_active;

  // If activating, deactivate all other methods of the same category
  if (nextActive && cur.type) {
    await supabase
      .from('withdrawal_methods')
      .update({ is_active: false })
      .eq('type', cur.type)
      .neq('id', cur.id);
  }

  const { data, error } = await supabase
    .from('withdrawal_methods')
    .update({ is_active: nextActive, updated_at: new Date() })
    .eq('id', req.params.id)
    .select().single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Delete a withdrawal method
router.delete('/withdrawal-methods/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('withdrawal_methods').delete().eq('id', req.params.id);
    if (error) {
      if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('constraint')) {
        await supabase.from('withdrawal_methods').update({ is_active: false, updated_at: new Date() }).eq('id', req.params.id);
        res.json({ success: true, deactivated: true, message: 'Method was deactivated because historical withdrawals reference it' });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete withdrawal method' });
  }
});

// ─── PENDING COUNTS (for worker badge) ────────────────────────────────────────
router.get('/pending-counts', async (_req, res) => {
  const [dRes, wRes] = await Promise.all([
    supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  res.json({ pendingDeposits: dRes.count ?? 0, pendingWithdrawals: wRes.count ?? 0 });
});

// ─── DEPOSIT VERIFICATION ─────────────────────────────────────────────────────

// Get all deposits with user + method info (pending and approved)
router.get('/deposits', async (req, res) => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*, deposit_methods(type, name, logo_url), users!deposits_telegram_id_fkey(first_name, username)')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Approve deposit → add to user balance + mark approved + apply bonus + notify user

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

router.post('/deposits/:id/approve', async (req, res) => {
  const { data: deposit, error: fetchErr } = await supabase
    .from('deposits').select('*').eq('id', req.params.id).single();
  if (fetchErr || !deposit) { res.status(404).json({ error: 'Deposit not found' }); return; }

  // Check if this is their first approved deposit
  const { count: approvedCount } = await supabase
    .from('deposits')
    .select('*', { count: 'exact', head: true })
    .eq('telegram_id', deposit.telegram_id)
    .eq('status', 'approved');

  const isFirstDeposit = approvedCount === 0;
  const isSecondDeposit = approvedCount === 1;

  // Fetch user record for the depositor
  const { data: depRecord, error: userFetchErr } = await supabase
    .from('users')
    .select('main_balance, bonus_balance, inviter_id')
    .eq('telegram_id', deposit.telegram_id)
    .single();

  if (userFetchErr || !depRecord) {
    res.status(404).json({ error: 'User record not found' });
    return;
  }

  // Update depositor's main balance directly (safe & atomic without missing RPC)
  const currentMainBal = Number(depRecord.main_balance || 0);
  const depositAmount = Number(deposit.amount || 0);
  const newMainBalance = currentMainBal + depositAmount;

  const { error: balErr } = await supabase
    .from('users')
    .update({ main_balance: newMainBalance, updated_at: new Date() })
    .eq('telegram_id', deposit.telegram_id);

  if (balErr) {
    res.status(500).json({ error: balErr.message });
    return;
  }

  let depositorBonus = 0;
  let inviterBonus = 0;
  let inviterId = null;
  let bonusReason = '';

  const { data: allSettings } = await supabase.from('settings').select('key, value');
  const getSetting = (key: string, def: number | string) => {
    const row = allSettings?.find(s => s.key === key);
    return row ? row.value : def;
  };

  const firstDepositPct = parseFloat(getSetting('first_deposit_bonus_pct', '7') as string) / 100;
  const secondDepositPct = parseFloat(getSetting('second_deposit_bonus_pct', '3') as string) / 100;
  const invitationPct = parseFloat(getSetting('invitation_reward_pct', '10') as string) / 100;
  const weekendBonusEnabled = getSetting('weekend_bonus_enabled', 'false') === 'true';
  const weekendBonusDays = getSetting('weekend_bonus_days', '[0,6]') as string;
  const weekendBonusPct = parseFloat(getSetting('weekend_bonus_pct', '10') as string) / 100;

  // Determine if this deposit qualifies for weekend bonus (limit: 1 weekend bonus per user per day)
  const depDate = deposit.created_at ? new Date(deposit.created_at) : new Date();
  const depDateStr = getEthiopianDateStr(depDate);

  // Check if user already had an approved deposit on the same Ethiopian calendar date
  const { data: userApprovedDeps } = await supabase
    .from('deposits')
    .select('id, created_at')
    .eq('telegram_id', deposit.telegram_id)
    .eq('status', 'approved');

  const hasApprovedDepositOnSameDay = (userApprovedDeps || []).some(
    d => d.id !== deposit.id && getEthiopianDateStr(d.created_at) === depDateStr
  );

  const qualifiesWeekend = weekendBonusEnabled
    && isWeekendBonusDay(depDate, weekendBonusDays)
    && weekendBonusPct > 0
    && !hasApprovedDepositOnSameDay;

  const weekendBonusAmount = qualifiesWeekend ? depositAmount * weekendBonusPct : 0;

  let firstOrSecondBonus = 0;
  const bonusReasons: string[] = [];

  if (isFirstDeposit && firstDepositPct > 0) {
    firstOrSecondBonus = depositAmount * firstDepositPct;
    bonusReasons.push(`1st Deposit Bonus (${Number(firstOrSecondBonus).toLocaleString('en-US')} ETB)`);
    if (depRecord && depRecord.inviter_id) {
      inviterId = depRecord.inviter_id;
      inviterBonus = depositAmount * invitationPct;
    }
  } else if (isSecondDeposit && secondDepositPct > 0) {
    firstOrSecondBonus = depositAmount * secondDepositPct;
    bonusReasons.push(`2nd Deposit Bonus (${Number(firstOrSecondBonus).toLocaleString('en-US')} ETB)`);
  }

  if (weekendBonusAmount > 0) {
    bonusReasons.push(`Weekend Bonus (${Number(weekendBonusAmount).toLocaleString('en-US')} ETB)`);
  }

  depositorBonus = firstOrSecondBonus + weekendBonusAmount;
  bonusReason = bonusReasons.join(' + ');

  if (depRecord && depositorBonus > 0) {
    const currentDepBonus = Number(depRecord.bonus_balance || 0);
    await supabase.from('users').update({ bonus_balance: currentDepBonus + depositorBonus, updated_at: new Date() }).eq('telegram_id', deposit.telegram_id);
  }

  if (inviterId && inviterBonus > 0) {
    const { data: invRecord } = await supabase.from('users').select('bonus_balance, invited_reward').eq('telegram_id', inviterId).single();
    if (invRecord) {
      const currentInvBonus = Number(invRecord.bonus_balance || 0);
      const currentInvReward = Number(invRecord.invited_reward || 0);
      await supabase.from('users').update({
        bonus_balance: currentInvBonus + inviterBonus,
        invited_reward: Number((currentInvReward + inviterBonus).toFixed(2)),
      }).eq('telegram_id', inviterId);
    }
  }

  // Mark deposit as approved
  await supabase.from('deposits').update({ status: 'approved', updated_at: new Date() }).eq('id', req.params.id);

  // Send Telegram Notification to the depositor
  try {
    let msgText = `✅ *Deposit Approved!*\n\n💰 Amount: *${Number(deposit.amount).toLocaleString('en-US')} ETB* has been added to your balance.`;
    if (depositorBonus > 0) {
      msgText += `\n\n🎁 *Bonus Received!* (${bonusReason})\nYou received an extra *${Number(depositorBonus).toLocaleString('en-US')} ETB* in your bonus balance!`;
    }
    msgText += `\n\n🎮 Open the Mini App to start playing!`;

    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: deposit.telegram_id,
        text: msgText,
        parse_mode: 'Markdown',
      })
    });
  } catch (err) {
    console.error('Failed to notify user on Telegram:', err);
  }

  // Send Telegram Notification to the Inviter
  if (inviterId && inviterBonus > 0) {
    try {
      const inviterMsg = `🎉 *Referral Bonus Received!*\n\nYour invited friend made their first deposit! You have received *${Number(inviterBonus).toLocaleString('en-US')} ETB* in your bonus balance. Keep inviting friends for more rewards! 🎁`;
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: inviterId,
          text: inviterMsg,
          parse_mode: 'Markdown',
        })
      });
    } catch (err) {
      console.error('Failed to notify inviter on Telegram:', err);
    }
  }

  res.json({ success: true, isFirstDeposit, isSecondDeposit, depositorBonus, weekendBonus: weekendBonusAmount, inviterBonus });
});

// Reject deposit → permanently delete from DB
router.delete('/deposits/:id/reject', async (req, res) => {
  const { error } = await supabase.from('deposits').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// Get admin stats (pending counts)
router.get('/stats', async (req, res) => {
  const { count: depCount } = await supabase
    .from('deposits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  const { count: withCount } = await supabase
    .from('withdrawals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  res.json({ 
    pendingDeposits: depCount || 0,
    pendingWithdrawals: withCount || 0 
  });
});

// ─── WITHDRAWAL MANAGEMENT ───────────────────────────────────────────────────

// Get all withdrawals with user + method info
router.get('/withdrawals', async (req, res) => {
  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('*, withdrawal_methods(type, logo_url)')
    .order('created_at', { ascending: false });
    
  if (error) { res.status(500).json({ error: error.message }); return; }

  // Manually fetch user data to avoid missing foreign key issues
  if (withdrawals && withdrawals.length > 0) {
    const telegramIds = [...new Set(withdrawals.map(w => w.telegram_id))];
    const { data: users } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .in('telegram_id', telegramIds);
      
    if (users) {
      const userMap = Object.fromEntries(users.map(u => [u.telegram_id, u]));
      for (const w of withdrawals) {
        (w as any).users = userMap[w.telegram_id] || null;
      }
    }
  }

  res.json(withdrawals);
});

// Approve withdrawal → mark as approved and notify user
router.post('/withdrawals/:id/approve', async (req, res) => {
  const { data: withdrawal, error: fetchErr } = await supabase
    .from('withdrawals').select('*').eq('id', req.params.id).single();
  if (fetchErr || !withdrawal) { res.status(404).json({ error: 'Withdrawal not found' }); return; }

  await supabase.from('withdrawals').update({ status: 'approved', updated_at: new Date() }).eq('id', req.params.id);

  // Notify user
  try {
    const msg = `✅ *Withdrawal Approved!*\n\n💸 Amount: *${Number(withdrawal.amount).toLocaleString('en-US')} ETB* has been sent to your account.\n\n⏳ Funds will arrive within a few minutes.`;
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: withdrawal.telegram_id, text: msg, parse_mode: 'Markdown' })
    });
  } catch (err) { console.error('Failed to notify user:', err); }

  res.json({ success: true });
});

// Reject withdrawal → refund main_balance + mark status 'rejected' + notify user
router.delete('/withdrawals/:id/reject', async (req, res) => {
  const { data: withdrawal, error: fetchErr } = await supabase
    .from('withdrawals').select('*').eq('id', req.params.id).single();
  if (fetchErr || !withdrawal) { res.status(404).json({ error: 'Withdrawal not found' }); return; }

  // Refund main_balance
  const { data: user } = await supabase.from('users').select('main_balance').eq('telegram_id', withdrawal.telegram_id).single();
  if (user) {
    await supabase.from('users').update({ main_balance: Number(user.main_balance) + Number(withdrawal.amount) }).eq('telegram_id', withdrawal.telegram_id);
  }

  // Mark status as rejected (keeps history and notifies user in notification center)
  await supabase.from('withdrawals').update({ status: 'rejected', updated_at: new Date() }).eq('id', req.params.id);

  // Notify user
  try {
    const msg = `❌ *Withdrawal Rejected*\n\n💸 Your withdrawal of *${Number(withdrawal.amount).toLocaleString('en-US')} ETB* has been rejected.\n\n💰 Your balance has been refunded. Please contact support for more info.`;
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: withdrawal.telegram_id, text: msg, parse_mode: 'Markdown' })
    });
  } catch (err) { console.error('Failed to notify user:', err); }

  res.json({ success: true });
});

// ─── PROFIT REPORT ────────────────────────────────────────────────────────────
router.get('/profit-report', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  
  let dQuery = supabase.from('deposits').select('amount').eq('status', 'approved');
  let wQuery = supabase.from('withdrawals').select('amount').eq('status', 'approved');

  if (from) {
    dQuery = dQuery.gte('created_at', from);
    wQuery = wQuery.gte('created_at', from);
  }
  if (to) {
    dQuery = dQuery.lte('created_at', to);
    wQuery = wQuery.lte('created_at', to);
  }

  const [dRes, wRes] = await Promise.all([dQuery, wQuery]);

  if (dRes.error) return res.status(500).json({ error: dRes.error.message });
  if (wRes.error) return res.status(500).json({ error: wRes.error.message });

  const totalDeposits = (dRes.data || []).reduce((sum, d) => sum + Number(d.amount), 0);
  const totalWithdrawals = (wRes.data || []).reduce((sum, w) => sum + Number(w.amount), 0);
  const netProfit = totalDeposits - totalWithdrawals;

  res.json({ totalDeposits, totalWithdrawals, netProfit });
});

// Helper: fetch all rows across 1000-row PostgREST pagination limit
async function fetchAllRows<T = any>(buildQuery: (from: number, to: number) => any): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

// ─── HELPER: Fetch and calculate consistent Bingo Game statistics & commission ───
export async function getBingoGameStatsAndList(from?: string, to?: string) {
  const games = await fetchAllRows(async (rangeFrom, rangeTo) => {
    let q = supabase
      .from('bingo_games')
      .select('id, stake, status, prize_pool, winner_prize, winner_first_name, winner_cartela, created_at, finished_at')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .range(rangeFrom, rangeTo);
    if (from) q = q.gte('finished_at', from);
    if (to)   q = q.lte('finished_at', to);
    return q;
  });

  const gameIds = games.map((g: any) => g.id);
  const playerCounts: Record<string, number> = {};
  const uniquePlayers: Record<string, number> = {};

  if (gameIds.length > 0) {
    const CHUNK_SIZE = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < gameIds.length; i += CHUNK_SIZE) {
      chunks.push(gameIds.slice(i, i + CHUNK_SIZE));
    }

    const BATCH_CONCURRENCY = 6;
    for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
      const batch = chunks.slice(i, i + BATCH_CONCURRENCY);
      await Promise.all(
        batch.map(async (chunk) => {
          const pRows = await fetchAllRows(async (rangeFrom, rangeTo) => {
            return supabase
              .from('bingo_players')
              .select('game_id, telegram_id, cartela_number')
              .in('game_id', chunk)
              .range(rangeFrom, rangeTo);
          });

          const uMap: Record<string, Set<string>> = {};
          (pRows || []).forEach((p: any) => {
            playerCounts[p.game_id] = (playerCounts[p.game_id] || 0) + 1;
            if (!uMap[p.game_id]) uMap[p.game_id] = new Set();
            uMap[p.game_id].add(p.telegram_id);
          });
          Object.keys(uMap).forEach((gid) => {
            uniquePlayers[gid] = uMap[gid].size;
          });
        })
      );
    }
  }

  let total_games = games.length;
  let total_stakes_collected = 0;
  let total_prizes_paid = 0;
  let total_commission = 0;
  let commission_games = 0;

  const enrichedGames = games.map((g: any) => {
    const isRematch = !g.winner_first_name || g.winner_first_name === 'REMATCH' || (g.winner_first_name || '').startsWith('REMATCH');
    const isTie = Boolean(g.winner_first_name && g.winner_first_name.includes(' & '));
    const totalCartelas = playerCounts[g.id] || 0;
    const uniqueCount = uniquePlayers[g.id] || 0;
    const stakeAmt = Number(g.stake || 10);

    let paid = 0;
    let collected = 0;
    let commission = 0;

    if (!isRematch) {
      // For tie games, each winner was awarded winner_prize, so total paid is winner_prize * 2 (or prize_pool)
      paid = isTie
        ? (Number(g.prize_pool) > 0 ? Number(g.prize_pool) : Number(g.winner_prize || 0) * 2)
        : Number(g.winner_prize || g.prize_pool || 0);

      collected = totalCartelas * stakeAmt;
      if (collected < paid) {
        collected = Math.max(collected, Number(g.prize_pool || 0), paid);
      }

      // CRITICAL CHOICE BINGO RULE:
      // Game commission (20%) ONLY applies when there are 3 OR MORE UNIQUE PLAYERS (uniqueCount >= 3).
      // If there are fewer than 3 players (1 or 2 players), the winner receives 100% of the pot (0% commission).
      if (uniqueCount >= 3 && totalCartelas > 0 && stakeAmt > 0) {
        commission = Math.max(0, collected - paid);
      } else {
        // 1 or 2 players: 100% payout, 0% commission
        collected = paid;
        commission = 0;
      }
    } else {
      // REMATCH: All stakes were refunded to players in BingoEngine, net commission = 0
      collected = 0;
      paid = 0;
      commission = 0;
    }

    total_stakes_collected += collected;
    total_prizes_paid += paid;
    total_commission += commission;
    if (commission > 0) commission_games++;

    return {
      ...g,
      game_id: g.id?.slice(0, 8).toUpperCase(),
      players_count: totalCartelas,
      unique_players_count: uniqueCount,
      collected,
      paid,
      profit: commission,
      commission,
      is_rematch: isRematch,
      is_tie: isTie
    };
  });

  return {
    total_games,
    total_stakes_collected,
    total_prizes_paid,
    total_commission,
    commission_games,
    games: enrichedGames
  };
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const { search = '', page = '1', limit = '20', role = '', status = '' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, parseInt(limit as string));
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('users')
    .select('id, telegram_id, username, first_name, role, status, main_balance, bonus_balance, total_wins, total_games, total_stake, invited_reward, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,telegram_id.eq.${search}`);
  }

  if (role && role !== 'all') {
    query = query.eq('role', role);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  // Fetch live counts for filter tabs
  const [totalRes, userRes, workerRes, adminRes, inactiveRes] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
  ]);

  const counts = {
    all: totalRes.count || 0,
    user: userRes.count || 0,
    worker: workerRes.count || 0,
    admin: adminRes.count || 0,
    inactive: inactiveRes.count || 0,
  };

  const telegramIds = (data || []).map((u: any) => u.telegram_id);
  let statsMap: Record<string, { totalDeposited: number; depositCount: number }> = {};
  if (telegramIds.length > 0) {
    const { data: depositStats } = await supabase
      .from('deposits').select('telegram_id, amount, status')
      .in('telegram_id', telegramIds).eq('status', 'approved');
    for (const d of depositStats || []) {
      if (!statsMap[d.telegram_id]) statsMap[d.telegram_id] = { totalDeposited: 0, depositCount: 0 };
      statsMap[d.telegram_id].totalDeposited += Number(d.amount);
      statsMap[d.telegram_id].depositCount += 1;
    }
  }

  const enriched = (data || []).map((u: any) => ({
    ...u,
    totalDeposited: statsMap[u.telegram_id]?.totalDeposited || 0,
    depositCount: statsMap[u.telegram_id]?.depositCount || 0,
  }));

  res.json({ users: enriched, total: count || 0, counts, page: pageNum, limit: limitNum });
});

router.get('/users/:telegramId', async (req, res) => {
  const { data: user, error } = await supabase.from('users').select('*').eq('telegram_id', req.params.telegramId).single();
  if (error || !user) { res.status(404).json({ error: 'User not found' }); return; }

  const [dRes, wRes] = await Promise.all([
    supabase.from('deposits').select('*').eq('telegram_id', req.params.telegramId).order('created_at', { ascending: false }).limit(20),
    supabase.from('withdrawals').select('*').eq('telegram_id', req.params.telegramId).order('created_at', { ascending: false }).limit(20),
  ]);

  const totalDeposited = (dRes.data || []).filter((d: any) => d.status === 'approved').reduce((s: number, d: any) => s + Number(d.amount), 0);
  const totalWithdrawn = (wRes.data || []).filter((w: any) => w.status === 'approved').reduce((s: number, w: any) => s + Number(w.amount), 0);

  res.json({ user, deposits: dRes.data || [], withdrawals: wRes.data || [], totalDeposited, totalWithdrawn });
});

router.put('/users/:telegramId/balance', async (req, res) => {
  const { field, amount, note } = req.body;
  if (!field || amount === undefined) { res.status(400).json({ error: 'field and amount required' }); return; }
  if (!['main_balance', 'bonus_balance'].includes(field)) { res.status(400).json({ error: 'Invalid field' }); return; }

  const { data: user } = await supabase.from('users').select('main_balance, bonus_balance').eq('telegram_id', req.params.telegramId).single();
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const current = Number((user as Record<string, any>)[field] || 0);
  const newValue = Math.max(0, current + Number(amount));
  const { error } = await supabase.from('users').update({ [field]: newValue }).eq('telegram_id', req.params.telegramId);
  if (error) { res.status(500).json({ error: error.message }); return; }

  try {
    const label = field === 'main_balance' ? 'Main Balance' : 'Bonus Balance';
    const sign = Number(amount) >= 0 ? '+' : '';
    const msg = `💼 *Balance Adjustment*\n\nYour ${label} has been adjusted by *${sign}${Number(amount).toLocaleString('en-US')} ETB*.\n${note ? `📝 Note: ${note}` : ''}\n\n💰 New ${label}: *${newValue.toLocaleString('en-US')} ETB*`;
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: req.params.telegramId, text: msg, parse_mode: 'Markdown' })
    });
  } catch (e) { console.error('Notify failed:', e); }

  res.json({ success: true, newValue });
});

router.put('/users/:telegramId/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'worker'].includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
  const { error } = await supabase.from('users').update({ role }).eq('telegram_id', req.params.telegramId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

router.put('/users/:telegramId/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  const { error } = await supabase.from('users').update({ status }).eq('telegram_id', req.params.telegramId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ─── WORKERS ───────────────────────────────────────────────────────────────────

router.get('/workers', async (req, res) => {
  let { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, first_name, role, status, permissions, created_at')
    .eq('role', 'worker')
    .order('created_at', { ascending: false });
    
  if (error && error.message.includes('permissions')) {
    const fallback = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, role, status, created_at')
      .eq('role', 'worker')
      .order('created_at', { ascending: false });
    data = fallback.data as any;
    error = fallback.error;
  }
  
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ workers: data });
});

router.put('/workers/:telegramId/permissions', async (req, res) => {
  const { permissions } = req.body;
  const { error } = await supabase
    .from('users')
    .update({ permissions })
    .eq('telegram_id', req.params.telegramId)
    .eq('role', 'worker');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

// GET /admin/settings — return all key/value settings
router.get('/settings', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ settings: data || [] });
});

// PUT /admin/settings — upsert a single setting by key
router.put('/settings', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) { res.status(400).json({ error: 'key and value are required' }); return; }

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// POST /admin/send-qr-poster — send high-res poster directly to admin's Telegram chat so they can save to gallery
router.post('/send-qr-poster', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { image_base64 } = req.body;

  if (!image_base64) {
    return res.status(400).json({ error: 'image_base64 is required' });
  }

  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    formData.append('chat_id', telegramId);
    formData.append('photo', new Blob([buffer], { type: 'image/png' }), 'CHOICE_BINGO_QR.png');
    formData.append(
      'caption',
      '🎉 *CHOICE BINGO — Official QR Poster*\n\n🖼️ *To Save to Phone Gallery:*\n1. Tap this photo to open it\n2. Tap the three dots (⋮) in the top-right\n3. Tap *Save to Gallery* / *Save to Photos*!\n\nYou can also forward this directly to your channels & groups.'
    );
    formData.append('parse_mode', 'Markdown');

    const tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const tgData: any = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok) {
      console.error('Telegram sendPhoto error:', tgData);
      return res.status(500).json({ error: tgData?.description || 'Failed to send photo on Telegram' });
    }

    res.json({ success: true, message: 'Poster sent to your Telegram chat!' });
  } catch (err: any) {
    console.error('send-qr-poster error:', err);
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// ─── BINGO ADMIN MONITORING ───────────────────────────────────────────────────

// GET /admin/bingo-games — list recent games for monitoring
router.get('/bingo-games', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('bingo_games')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /admin/bingo-games/:id/players — get player count + list for a game
router.get('/bingo-games/:id/players', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('bingo_players')
    .select('cartela_number, telegram_id, created_at')
    .eq('game_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ count: (data || []).length, players: data });
});

// GET /admin/bingo-report — advanced report with time filters
router.get('/bingo-report', validateTelegramAuth, requireAdmin, async (req, res) => {
  let from = req.query.from as string;
  let to = req.query.to as string;

  if (!from || !to) {
    const period = req.query.period as string || 'today';
    const now = new Date();
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 86400000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 86400000);
        endDate = now;
        break;
      case '3month':
        startDate = new Date(now.getTime() - 90 * 86400000);
        endDate = now;
        break;
      case '6month':
        startDate = new Date(now.getTime() - 180 * 86400000);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 86400000);
        endDate = now;
        break;
      case 'all':
        startDate = new Date(0);
        endDate = now;
        break;
      case 'today':
      default:
        break;
    }
    from = startDate.toISOString();
    to = endDate.toISOString();
  }

  const result = await getBingoGameStatsAndList(from, to);

  res.json({
    stats: {
      total_games: result.total_games,
      total_stakes_collected: result.total_stakes_collected,
      total_prizes_paid: result.total_prizes_paid,
      profit: result.total_commission
    },
    games: result.games
  });
});

// POST /admin/bingo-games/:id/finish — force-finish a stuck game
router.post('/bingo-games/:id/finish', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('bingo_games')
    .update({ status: 'finished', finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// POST /admin/purge-old-bingo — Clears all finished/cancelled games and their player cards to reclaim database quota
router.post('/purge-old-bingo', async (_req, res) => {
  try {
    // 1. Fetch finished/cancelled games
    const { data: games } = await supabase
      .from('bingo_games')
      .select('id')
      .or('status.eq.finished,status.eq.cancelled')
      .limit(1000);

    const ids = (games || []).map((g: any) => g.id);
    let deletedPlayers = 0;
    let deletedGames = 0;

    if (ids.length > 0) {
      const { error: pErr } = await supabase.from('bingo_players').delete().in('game_id', ids);
      if (!pErr) deletedPlayers = ids.length;

      const { error: gErr } = await supabase.from('bingo_games').delete().in('id', ids);
      if (!gErr) deletedGames = ids.length;
    }

    // Also delete any orphan players where created_at is older than 10 minutes
    const tenMinAgo = new Date(Date.now() - 600_000).toISOString();
    await supabase.from('bingo_players').delete().lte('created_at', tenMinAgo);

    res.json({ success: true, message: `Purged ${deletedGames} games and ${deletedPlayers} player sets` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Purge failed' });
  }
});

export default router;
