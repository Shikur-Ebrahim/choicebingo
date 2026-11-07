import { Router } from 'express';
import crypto from 'crypto';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass.trim()).digest('hex');
}

export function normalizePhone9(phone: string): string {
  let clean = (phone || '').trim().replace(/[^\d]/g, '');
  if (clean.startsWith('251')) clean = clean.slice(3);
  if (clean.startsWith('0')) clean = clean.slice(1);
  return clean;
}

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

// ── PWA USER REGISTRATION WITH PHONE, FIRST NAME & PASSWORD ──
router.post('/pwa-register', async (req, res) => {
  try {
    const { phone, password, first_name } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'ስልክ ቁጥር ያስፈልጋል (Phone number is required).' });
      return;
    }

    const cleanPhone = normalizePhone9(phone);
    if (!cleanPhone.match(/^(9|7)\d{8}$/)) {
      res.status(400).json({ error: 'እባክዎ ባለ 9 አሃዝ ስልክ ቁጥር ያስገቡ (በ 9 ወይም 7 የሚጀምር፣ ለምሳሌ፡ 964582376)' });
      return;
    }

    const cleanName = (first_name || '').trim();
    if (!cleanName) {
      res.status(400).json({ error: 'እባክዎ ሙሉ ስምዎን ያስገቡ (Please enter your name).' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({ error: 'የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት (Password must be at least 4 characters).' });
      return;
    }

    const pwdHash = hashPassword(password);

    // Check if user already exists by 9-digit or legacy 10-digit
    let { data: existing } = await supabase.from('users').select('*').eq('telegram_id', cleanPhone).maybeSingle();
    if (!existing) {
      const { data: legacy } = await supabase.from('users').select('*').eq('telegram_id', '0' + cleanPhone).maybeSingle();
      if (legacy) existing = legacy;
    }

    if (existing) {
      if (existing.status === 'inactive') {
        res.status(403).json({ error: 'መለያዎ ታግዷል:: እባክዎ ድጋፍ ሰጪ ያግኙ (Your account has been deactivated).' });
        return;
      }

      const existingPwd = existing.permissions?.password_hash;
      if (existingPwd) {
        res.status(400).json({ error: 'ይህ ስልክ ቁጥር ቀደም ሲል ተመዝግቧል:: እባክዎ "ግባ (Log In)" የሚለውን ይጫኑ::' });
        return;
      }

      // Legacy user setting password for first time
      const updatedPermissions = { ...(existing.permissions || {}), password_hash: pwdHash };
      const { data: updatedUser, error: updateErr } = await supabase
        .from('users')
        .update({
          telegram_id: cleanPhone,
          username: cleanPhone,
          first_name: cleanName,
          permissions: updatedPermissions,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        res.status(500).json({ error: updateErr.message });
        return;
      }
      res.json({ success: true, user: updatedUser });
      return;
    }

    // New user registration
    const { data: settingRow } = await supabase.from('settings').select('value').eq('key', 'welcome_bonus_amount').maybeSingle();
    const welcomeBonus = settingRow && !isNaN(Number(settingRow.value)) ? Number(settingRow.value) : 0;

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id: cleanPhone,
        username: cleanPhone,
        first_name: cleanName,
        main_balance: 0,
        bonus_balance: welcomeBonus,
        total_games: 0,
        total_stake: 0,
        invited_reward: 0,
        permissions: { password_hash: pwdHash, registered_via: 'pwa' }
      })
      .select().single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// ── PWA USER LOGIN WITH PHONE & PASSWORD ──
router.post('/pwa-login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'ስልክ ቁጥር ያስፈልጋል (Phone number is required).' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'የይለፍ ቃል ያስፈልጋል (Password is required).' });
      return;
    }

    const cleanPhone = normalizePhone9(phone);
    if (!cleanPhone.match(/^(9|7)\d{8}$/)) {
      res.status(400).json({ error: 'እባክዎ ባለ 9 አሃዝ ስልክ ቁጥር ያስገቡ (በ 9 ወይም 7 የሚጀምር፣ ለምሳሌ፡ 964582376)' });
      return;
    }

    const pwdHash = hashPassword(password);

    // Look up by clean 9-digit or legacy 10-digit
    let { data: user } = await supabase.from('users').select('*').eq('telegram_id', cleanPhone).maybeSingle();
    if (!user) {
      const { data: legacy } = await supabase.from('users').select('*').eq('telegram_id', '0' + cleanPhone).maybeSingle();
      if (legacy) user = legacy;
    }

    if (!user) {
      res.status(404).json({ error: 'ይህ ስልክ ቁጥር አልተመዘገበም:: እባክዎ መጀመሪያ "ይመዝገቡ (Register)" የሚለውን ይምረጡ::' });
      return;
    }

    if (user.status === 'inactive') {
      res.status(403).json({ error: 'መለያዎ ታግዷል:: እባክዎ ድጋፍ ሰጪ ያግኙ (Your account has been deactivated).' });
      return;
    }

    const storedHash = user.permissions?.password_hash;
    if (storedHash) {
      if (storedHash !== pwdHash) {
        res.status(401).json({ error: 'የተሳሳተ የይለፍ ቃል ነው:: እባክዎ እንደገና ይሞክሩ (Incorrect password).' });
        return;
      }
    } else {
      // First time setting password for this number
      await supabase
        .from('users')
        .update({
          permissions: { ...(user.permissions || {}), password_hash: pwdHash }
        })
        .eq('id', user.id);
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
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
