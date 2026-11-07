import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

router.post('/verify', validateTelegramAuth, async (req: AuthRequest, res) => {
  const user = req.telegramUser!;
  
  // Check if user already exists
  const { data: existing } = await supabase.from('users').select('*').eq('telegram_id', user.id.toString()).maybeSingle();
  if (existing && existing.status === 'inactive') {
    res.status(403).json({ error: 'Your account has been deactivated.' });
    return;
  }

  if (existing) {
    const { data, error } = await supabase
      .from('users')
      .update({ username: user.username || user.first_name, first_name: user.first_name })
      .eq('telegram_id', user.id.toString())
      .select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ user: data });
  } else {
    // New user: fetch welcome bonus from settings (default 0)
    const { data: settingRow } = await supabase.from('settings').select('value').eq('key', 'welcome_bonus_amount').maybeSingle();
    const welcomeBonus = settingRow && !isNaN(Number(settingRow.value)) ? Number(settingRow.value) : 0;

    const { data, error } = await supabase
      .from('users')
      .insert({
        telegram_id: user.id.toString(),
        username: user.username || user.first_name,
        first_name: user.first_name,
        main_balance: 0,
        bonus_balance: welcomeBonus,
        total_games: 0,
        total_stake: 0,
        invited_reward: 0,
      })
      .select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ user: data });
  }
});

// PWA Direct Phone Registration & Login Endpoint
router.post('/pwa-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (cleanPhone.length < 9) {
      res.status(400).json({ error: 'Please enter a valid phone number (at least 9 digits).' });
      return;
    }

    // Check if user already exists
    const { data: existing } = await supabase.from('users').select('*').eq('telegram_id', cleanPhone).maybeSingle();
    if (existing && existing.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated.' });
      return;
    }

    if (existing) {
      res.json({ success: true, user: existing });
      return;
    }

    // New user: welcome bonus from settings
    const { data: settingRow } = await supabase.from('settings').select('value').eq('key', 'welcome_bonus_amount').maybeSingle();
    const welcomeBonus = settingRow && !isNaN(Number(settingRow.value)) ? Number(settingRow.value) : 0;

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id: cleanPhone,
        username: cleanPhone,
        first_name: cleanPhone,
        main_balance: 0,
        bonus_balance: welcomeBonus,
        total_games: 0,
        total_stake: 0,
        invited_reward: 0,
      })
      .select().single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'PWA authentication failed' });
  }
});

export default router;
