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
    // If user is accessing via PWA / Phone, preserve their custom full name and username!
    if (req.isPwaUser) {
      res.json({ user: existing });
      return;
    }

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

    const cleanName = (first_name || '').trim().split(/\s+/)[0];
    if (!cleanName) {
      res.status(400).json({ error: 'እባክዎ የመጀመሪያ ስምዎን ያስገቡ (Please enter your first name).' });
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

// ── PWA USER LOGIN WITH PHONE OR TELEGRAM ID & PASSWORD ──
router.post('/pwa-login', async (req, res) => {
  try {
    const { phone, identifier: rawId, password } = req.body;
    const input = (rawId || phone || '').toString().trim();
    if (!input) {
      res.status(400).json({ error: 'ስልክ ቁጥር ወይም የቴሌግራም ID ያስፈልጋል (Phone number or Telegram ID is required).' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'የይለፍ ቃል ያስፈልጋል (Password is required).' });
      return;
    }

    const cleanInput = input.replace(/[^\d]/g, '');
    const cleanPhone = normalizePhone9(input);
    const pwdHash = hashPassword(password);

    // 1. Try finding by cleanInput directly (Telegram ID e.g. '8780037711' or phone '912345678')
    let { data: user } = cleanInput
      ? await supabase.from('users').select('*').eq('telegram_id', cleanInput).maybeSingle()
      : { data: null };

    // 2. If not found, try normalized 9-digit phone
    if (!user && cleanPhone && cleanPhone !== cleanInput) {
      const { data: pUser } = await supabase.from('users').select('*').eq('telegram_id', cleanPhone).maybeSingle();
      if (pUser) user = pUser;
    }

    // 3. If not found, try legacy 10-digit with leading 0 (e.g. '09XXXXXXXX')
    if (!user && cleanPhone) {
      const { data: legacy } = await supabase.from('users').select('*').eq('telegram_id', '0' + cleanPhone).maybeSingle();
      if (legacy) user = legacy;
    }

    // 4. If not found, try username
    if (!user) {
      const { data: uUser } = await supabase.from('users').select('*').eq('username', input).maybeSingle();
      if (uUser) user = uUser;
    }

    if (!user) {
      res.status(404).json({
        error: 'ይህ አካውንት አልተገኘም:: እባክዎ ትክክለኛ ስልክ ቁጥር ወይም የቴሌግራም ID ያስገቡ:: (Account not found. Please enter a valid phone number or Telegram ID.)'
      });
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
      // User has no password set yet (e.g. Telegram player who opened PWA before setting password)
      res.status(400).json({
        error: 'ለዚህ የቴሌግራም አካውንት የይለፍ ቃል ገና አልተዘጋጀም:: እባክዎ መጀመሪያ ቴሌግራም ላይ Choice Bingoን ከፍተው (Profile -> የዌብ የይለፍ ቃል) ውስጥ የይለፍ ቃል ያስቀምጡ:: (No password set for this Telegram account yet. Please open Choice Bingo in Telegram -> Profile -> Web Password to set it first).'
      });
      return;
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// ── SET OR UPDATE WEB / PWA PASSWORD FROM TELEGRAM MINI APP ──
router.post('/set-web-password', validateTelegramAuth, async (req: AuthRequest, res) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({ error: 'የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት (Password must be at least 4 characters).' });
      return;
    }

    const pwdHash = hashPassword(password);

    // Look up user
    let { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
    if (!user) {
      res.status(404).json({ error: 'ተጠቃሚው አልተገኘም (User not found).' });
      return;
    }

    const updatedPermissions = {
      ...(user.permissions || {}),
      password_hash: pwdHash,
      web_password_updated_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update({ permissions: updatedPermissions })
      .eq('id', user.id)
      .select()
      .single();

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({
      success: true,
      message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀምጧል! በቴሌግራም IDዎ ድህረ-ገጽ ላይ መግባት ይችላሉ:: (Password saved successfully!)',
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to set password' });
  }
});

// ── PWA USER RESET / CHANGE PASSWORD ──
router.post('/pwa-change-password', async (req, res) => {
  try {
    const { phone, current_password, new_password } = req.body;
    const authPhone = (req.headers['x-pwa-phone'] as string || '').trim();
    const targetPhone = normalizePhone9(phone || authPhone);

    if (!targetPhone) {
      res.status(400).json({ error: 'ስልክ ቁጥር አልተገኘም (Phone number is required).' });
      return;
    }

    if (!current_password || typeof current_password !== 'string') {
      res.status(400).json({ error: 'የቀድሞው የይለፍ ቃል ያስፈልጋል (Current password is required).' });
      return;
    }

    if (!new_password || typeof new_password !== 'string' || new_password.trim().length < 4) {
      res.status(400).json({ error: 'አዲሱ የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት (New password must be at least 4 characters).' });
      return;
    }

    // Look up user by 9-digit or legacy 10-digit
    let { data: user } = await supabase.from('users').select('*').eq('telegram_id', targetPhone).maybeSingle();
    if (!user) {
      const { data: legacy } = await supabase.from('users').select('*').eq('telegram_id', '0' + targetPhone).maybeSingle();
      if (legacy) user = legacy;
    }

    if (!user) {
      res.status(404).json({ error: 'ተጠቃሚው አልተገኘም (User not found).' });
      return;
    }

    const currentHash = hashPassword(current_password);
    const storedHash = user.permissions?.password_hash;

    if (storedHash && storedHash !== currentHash) {
      res.status(400).json({ error: 'የቀድሞው የይለፍ ቃል የተሳሳተ ነው (Current password is incorrect).' });
      return;
    }

    const newHash = hashPassword(new_password);
    const updatedPermissions = { ...(user.permissions || {}), password_hash: newHash };

    const { error: updateErr } = await supabase
      .from('users')
      .update({ permissions: updatedPermissions })
      .eq('id', user.id);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({ success: true, message: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! (Password changed successfully!)' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to change password' });
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
