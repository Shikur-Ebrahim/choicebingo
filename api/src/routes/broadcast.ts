/**
 * api/src/routes/broadcast.ts
 * Admin Broadcast / Post management
 *
 * Endpoints:
 *  GET    /api/broadcast                 â€“ list all posts (admin)
 *  GET    /api/broadcast/channel-default â€“ get default configured channel (@ChoiceBingo)
 *  POST   /api/broadcast                 â€“ create post (draft or scheduled)
 *  PUT    /api/broadcast/:id             â€“ update post
 *  DELETE /api/broadcast/:id             â€“ delete post (also deletes R2 media)
 *  POST   /api/broadcast/:id/send        â€“ immediately send/publish a post
 *  POST   /api/broadcast/presign         â€“ get R2 presigned URL for image/video upload
 */

import { Router, Response, NextFunction } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { getPresignedUploadUrl, deleteFromR2, uploadToR2 } from '../services/r2';
import crypto from 'crypto';

const router = Router();

// Default Telegram Channel
export const DEFAULT_CHANNEL = '@ChoiceBingo';

// â”€â”€ Middleware: admin only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const telegramId = req.telegramUser!.id.toString();
  const { data } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
  if (!data || data.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
};

/**
 * Normalizes any channel link or username into a valid Telegram chat_id:
 * - "https://t.me/ChoiceBingo" -> "@ChoiceBingo"
 * - "t.me/ChoiceBingo"        -> "@ChoiceBingo"
 * - "@ChoiceBingo"            -> "@ChoiceBingo"
 * - "ChoiceBingo"             -> "@ChoiceBingo"
 * - "-100123456789"         -> "-100123456789"
 * - empty / null            -> "@ChoiceBingo"
 */
export function normalizeTelegramChannel(input?: string | null): string {
  if (!input || !input.trim()) return DEFAULT_CHANNEL;
  let ch = input.trim();
  // Strip http://, https://, www., t.me/, telegram.me/
  ch = ch.replace(/^https?:\/\//i, '');
  ch = ch.replace(/^www\./i, '');
  ch = ch.replace(/^(t\.me|telegram\.me)\//i, '');
  ch = ch.replace(/\/.*$/, ''); // strip any trailing slash or path parts
  ch = ch.trim();
  if (!ch) return DEFAULT_CHANNEL;
  // If numeric channel/group ID (e.g. -100123456789 or 100123456789)
  if (ch.startsWith('-') || /^\d+$/.test(ch)) {
    return ch.startsWith('-') ? ch : `-${ch}`;
  }
  // Otherwise it's a username handle
  ch = ch.replace(/^@/, '');
  return `@${ch}`;
}

// â”€â”€ Helper: resolve Telegram Channel username or chat ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolveChannelId(customChannel?: string | null): Promise<string> {
  if (customChannel && customChannel.trim()) {
    return normalizeTelegramChannel(customChannel);
  }

  if (process.env.TELEGRAM_CHANNEL_ID && process.env.TELEGRAM_CHANNEL_ID.trim()) {
    return normalizeTelegramChannel(process.env.TELEGRAM_CHANNEL_ID);
  }

  try {
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['channel_link', 'channel_id', 'telegram_channel_id']);

    if (rows && rows.length > 0) {
      for (const k of ['channel_id', 'telegram_channel_id', 'channel_link']) {
        const found = rows.find(r => r.key === k && r.value);
        if (found && found.value.trim()) {
          return normalizeTelegramChannel(found.value);
        }
      }
    }
  } catch (err) {
    console.error('[Broadcast] Failed to read channel from settings:', err);
  }

  return DEFAULT_CHANNEL;
}

// â”€â”€ Helper: send one Telegram request with fallback for markdown parse errors â”€
async function sendTelegramRequest(
  base: string,
  endpoint: string,
  payload: any
): Promise<{ ok: boolean; error?: string }> {
  try {
    let r = await fetch(`${base}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errJson = (await r.json().catch(() => null)) as any;
      const desc = errJson?.description || r.statusText;

      // If Markdown parse failed (bad entity / formatting), retry without Markdown
      if (
        payload.parse_mode &&
        (desc.includes('parse') || desc.includes('entity') || desc.includes('can\'t parse'))
      ) {
        const plainPayload = { ...payload };
        delete plainPayload.parse_mode;
        const retryR = await fetch(`${base}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload),
        });
        if (retryR.ok) return { ok: true };
        const retryJson = (await retryR.json().catch(() => null)) as any;
        return { ok: false, error: retryJson?.description || retryR.statusText };
      }

      return { ok: false, error: desc };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// â”€â”€ Helper: send media / message to a user or channel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  body: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  isChannel = false
): Promise<{ ok: boolean; error?: string }> {
  const base = `https://api.telegram.org/bot${botToken}`;

  // Telegram photo/video caption limit is 1024 chars
  const isCaptionTooLong = mediaUrl && body.length > 1020;
  const caption = isCaptionTooLong ? body.slice(0, 1017) + '...' : body;

  let result: { ok: boolean; error?: string };

  // If mediaUrl is a legacy base64 Data URL, upload to R2 first so Telegram downloads smoothly
  if (mediaUrl && mediaUrl.startsWith('data:')) {
    try {
      const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const isVid = mime.startsWith('video/') || mediaType === 'video';
        const ext = mime.split('/')[1] || (isVid ? 'mp4' : 'png');
        const key = `${isVid ? 'post-videos' : 'post-images'}/${Date.now()}-legacy.${ext}`;
        mediaUrl = await uploadToR2(key, buffer, mime);
      }
    } catch (e: any) {
      console.error('Failed to convert base64 to R2 in sendTelegramMessage:', e);
    }
  }

  // Fetch dynamic links for channel & support
  let channelUrl = 'https://t.me/ChoiceBingo';
  let supportUrl = 'https://t.me/choicebingo_admin';
  try {
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['channel_link', 'support_username']);
    if (rows) {
      const ch = rows.find(r => r.key === 'channel_link')?.value;
      const sp = rows.find(r => r.key === 'support_username')?.value;
      if (ch && ch.trim()) channelUrl = ch.trim();
      if (sp && sp.trim()) supportUrl = sp.trim().startsWith('http') ? sp.trim() : `https://t.me/${sp.trim().replace(/^@/, '')}`;
    }
  } catch {}

  const miniAppUrl = process.env.MINI_APP_URL || 'https://ChoiceBingo.vercel.app';
  const botUsername = 'choicebingo_bot';

  // For Channel: use direct t.me link (Telegram channels only allow URL buttons)
  // For Bot Direct Chat: use direct WebApp launch for instant 1-tap full-screen play!
  const playButton = isChannel
    ? { text: '🎮 PLAY CHOICE BINGO NOW 🎯', url: `https://t.me/${botUsername}?start=channel` }
    : { text: '🎮 PLAY CHOICE BINGO NOW 🎯', web_app: { url: miniAppUrl } };

  const replyMarkup = isChannel
    ? {
        inline_keyboard: [
          [playButton],
          [{ text: '💬 24/7 Support', url: supportUrl }],
        ],
      }
    : {
        inline_keyboard: [
          [playButton],
          [
            { text: '📢 Official Channel', url: channelUrl },
            { text: '💬 24/7 Support', url: supportUrl },
          ],
        ],
      };

  if (mediaUrl && mediaType === 'video') {
    result = await sendTelegramRequest(base, 'sendVideo', {
      chat_id: chatId,
      video: mediaUrl,
      caption: caption || undefined,
      parse_mode: 'Markdown',
      supports_streaming: true,
      reply_markup: replyMarkup,
    });
  } else if (mediaUrl && mediaType === 'image') {
    result = await sendTelegramRequest(base, 'sendPhoto', {
      chat_id: chatId,
      photo: mediaUrl,
      caption: caption || undefined,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  } else {
    result = await sendTelegramRequest(base, 'sendMessage', {
      chat_id: chatId,
      text: body,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  }

  // If caption was too long, send the full body as follow-up text message
  if (result.ok && isCaptionTooLong) {
    await sendTelegramRequest(base, 'sendMessage', {
      chat_id: chatId,
      text: body,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  }

  return result;
}

// â”€â”€ Core: broadcast a post to all eligible users and/or channel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function executeBroadcast(postId: string): Promise<void> {
  const { data: post } = await supabase
    .from('broadcast_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) return;

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    await supabase.from('broadcast_posts').update({
      status: 'failed',
      error_message: 'BOT_TOKEN environment variable is not set on the server',
      updated_at: new Date().toISOString(),
    }).eq('id', postId);
    console.error('[Broadcast] BOT_TOKEN not set');
    return;
  }

  // Mark as sending
  await supabase.from('broadcast_posts').update({
    status: 'sending',
    updated_at: new Date().toISOString(),
  }).eq('id', postId);

  let sentCount = 0;
  let failedCount = 0;
  let lastError = '';

  const mediaUrl = post.media_url || null;
  const mediaType = post.media_type || null;

  // Format message text: combine title + body
  const messageText = post.title && post.title.trim()
    ? `*${post.title.trim()}*\n\n${post.body.trim()}`
    : post.body.trim();

  // â”€â”€ 1. Send to channel if requested â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sendToChannel = post.send_to === 'channel' || post.send_to === 'both';
  if (sendToChannel) {
    const channelId = await resolveChannelId(post.channel_id);
    console.log(`[Broadcast] Sending to Telegram channel: ${channelId} (post.id: ${postId})`);
    const res = await sendTelegramMessage(botToken, channelId, messageText, mediaUrl, mediaType, true);
    if (res.ok) {
      sentCount++;
      console.log(`[Broadcast] âœ… Successfully posted to channel ${channelId}`);
    } else {
      failedCount++;
      let friendlyError = res.error || 'Failed to send to channel';
      if (
        friendlyError.includes('chat not found') ||
        friendlyError.includes('not a member') ||
        friendlyError.includes('administrator') ||
        friendlyError.includes('CHAT_ADMIN')
      ) {
        friendlyError = `Channel (${channelId}): Bot is not an Administrator in the channel. Please add your Telegram Bot as an Admin in ${channelId} with "Post Messages" permission.`;
      }
      lastError = friendlyError;
      console.warn(`[Broadcast] âŒ Channel error: ${friendlyError}`);
    }
  }

  // â”€â”€ 2. Send to all users (excluding admins, workers, and inactive accounts) â”€â”€
  const sendToBot = post.send_to === 'bot' || post.send_to === 'both';
  if (sendToBot) {
    let page = 0;
    const pageSize = 100;

    while (true) {
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('telegram_id, role, status, username')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (uErr) {
        console.error('[Broadcast] Error fetching users page', page, uErr);
        if (!lastError) lastError = `DB error: ${uErr.message}`;
        break;
      }

      if (!users || users.length === 0) break;

      // Send to all active accounts: role 'admin', 'user', 'worker' all included!
      const eligible = users.filter((u: any) =>
        u.telegram_id &&
        u.status !== 'inactive' &&
        u.status !== 'banned'
      );

      console.log(`[Broadcast] Dispatching to ${eligible.length} active users (page ${page})`);

      for (const u of eligible) {
        await new Promise(r => setTimeout(r, 35)); // ~28 msg/sec Telegram rate limit
        console.log(`[Broadcast] Dispatching to ${u.telegram_id} (@${u.username || 'unknown'}, role: ${u.role})`);
        const res = await sendTelegramMessage(botToken, u.telegram_id, messageText, mediaUrl, mediaType, false);
        if (res.ok) {
          sentCount++;
        } else {
          failedCount++;
          console.warn(`[Broadcast] Failed to send to ${u.telegram_id}: ${res.error}`);
          if (!lastError && res.error) lastError = res.error;
        }
      }

      if (users.length < pageSize) break;
      page++;
    }
  }

  const finalStatus = sentCount > 0 ? 'sent' : 'failed';

  await supabase.from('broadcast_posts').update({
    status: finalStatus,
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
    error_message: lastError || null,
    updated_at: new Date().toISOString(),
  }).eq('id', postId);

  console.log(`[Broadcast] Post ${postId} finished: status=${finalStatus}, sent=${sentCount}, failed=${failedCount}`);
}

// â”€â”€ Background scheduler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let schedulerRunning = false;
export function startBroadcastScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  setInterval(async () => {
    try {
      const { data: duePosts } = await supabase
        .from('broadcast_posts')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (!duePosts || duePosts.length === 0) return;

      for (const p of duePosts) {
        console.log(`[Broadcast] Scheduled post due: ${p.id}`);
        executeBroadcast(p.id).catch(e => console.error('[Broadcast Scheduler]', e));
      }
    } catch (e) {
      console.error('[Broadcast Scheduler]', e);
    }
  }, 30_000);

  console.log('ðŸ“¢ Broadcast scheduler running');
}

// â”€â”€ GET /api/broadcast/channel-default â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/channel-default', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const channel = await resolveChannelId();
  res.json({ defaultChannel: channel || DEFAULT_CHANNEL });
});

// â”€â”€ GET /api/broadcast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/', validateTelegramAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('broadcast_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ posts: data || [] });
});

// â”€â”€ POST /api/broadcast/presign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST /api/broadcast/upload-media (Direct server-side upload to R2 - 0 CORS failure)
router.post('/upload-media', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { filename, contentType, base64 } = req.body;
  if (!filename || !contentType || !base64) {
    res.status(400).json({ error: 'filename, contentType, and base64 are required' });
    return;
  }

  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const allowed = [...allowedImages, ...allowedVideos];

  if (!allowed.includes(contentType)) {
    res.status(400).json({ error: 'Only image or video files are allowed' });
    return;
  }

  const isVideo = allowedVideos.includes(contentType);
  const ext = filename.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const folder = isVideo ? 'post-videos' : 'post-images';
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;

  try {
    const base64Data = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
    const buffer = Buffer.from(base64Data, 'base64');
    const publicUrl = await uploadToR2(key, buffer, contentType);
    res.json({
      success: true,
      publicUrl,
      key,
      mediaType: isVideo ? 'video' : 'image',
    });
  } catch (err: any) {
    console.error('[Broadcast Upload Error]:', err);
    res.status(500).json({ error: err.message || 'Media upload failed' });
  }
});

router.post('/presign', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType required' }); return;
  }
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const allowed = [...allowedImages, ...allowedVideos];

  if (!allowed.includes(contentType)) {
    res.status(400).json({ error: 'Only image/video files allowed' }); return;
  }

  const isVideo = allowedVideos.includes(contentType);
  const ext = filename.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const folder = isVideo ? 'post-videos' : 'post-images';
  const key = `${folder}/${crypto.randomBytes(10).toString('hex')}.${ext}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType, 600); // 10-minute window
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    res.json({ uploadUrl, publicUrl, key, mediaType: isVideo ? 'video' : 'image' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ POST /api/broadcast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const telegramId = req.telegramUser!.id.toString();
  const { title, body, media_url, media_key, media_type, send_to, channel_id, scheduled_at } = req.body;

  if (!body || !body.trim()) {
    res.status(400).json({ error: 'Post body is required' }); return;
  }
  const sendTo = ['bot', 'channel', 'both'].includes(send_to) ? send_to : 'bot';
  const status = scheduled_at ? 'scheduled' : 'draft';
  const resolvedChannel = (sendTo === 'channel' || sendTo === 'both')
    ? normalizeTelegramChannel(channel_id)
    : null;

  const { data, error } = await supabase
    .from('broadcast_posts')
    .insert({
      title: title || '',
      body: body.trim(),
      media_url: media_url || null,
      media_key: media_key || null,
      media_type: media_type || null,
      send_to: sendTo,
      channel_id: resolvedChannel,
      status,
      scheduled_at: scheduled_at || null,
      created_by: telegramId,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ post: data });
});

// â”€â”€ PUT /api/broadcast/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.put('/:id', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, body, media_url, media_key, media_type, send_to, channel_id, scheduled_at } = req.body;

  const { data: existing } = await supabase.from('broadcast_posts').select('status, media_key').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
  if (existing.status === 'sent' || existing.status === 'sending') {
    res.status(400).json({ error: 'Cannot edit a post that is already sent or sending' }); return;
  }

  if (media_key && existing.media_key && media_key !== existing.media_key) {
    deleteFromR2(existing.media_key).catch(() => {});
  }

  const sendTo = ['bot', 'channel', 'both'].includes(send_to) ? send_to : 'bot';
  const status = scheduled_at ? 'scheduled' : 'draft';
  const resolvedChannel = (sendTo === 'channel' || sendTo === 'both')
    ? normalizeTelegramChannel(channel_id)
    : null;

  const { data, error } = await supabase
    .from('broadcast_posts')
    .update({
      title: title || '',
      body: body?.trim(),
      media_url: media_url || null,
      media_key: media_key || null,
      media_type: media_type || null,
      send_to: sendTo,
      channel_id: resolvedChannel,
      status,
      scheduled_at: scheduled_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ post: data });
});

// â”€â”€ DELETE /api/broadcast/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/:id', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabase.from('broadcast_posts').select('media_key').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  if (existing.media_key) {
    deleteFromR2(existing.media_key).catch(() => {});
  }

  const { error } = await supabase.from('broadcast_posts').delete().eq('id', id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// â”€â”€ POST /api/broadcast/:id/send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ── POST /api/broadcast/:id/test (Send preview test directly to admin Telegram chat) ──
router.post('/:id/test', validateTelegramAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const adminTelegramId = req.telegramUser!.id.toString();

  const { data: post } = await supabase
    .from('broadcast_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    res.status(500).json({ error: 'BOT_TOKEN is not configured on the server' });
    return;
  }

  const mediaUrl = post.media_url || null;
  const mediaType = post.media_type || null;
  const messageText = post.title && post.title.trim()
    ? `*${post.title.trim()}*\n\n${post.body.trim()}`
    : post.body.trim();

  try {
    if (post.send_to === 'both') {
      // Send both previews so admin sees exact Bot DM and Channel buttons
      const botRes = await sendTelegramMessage(
        botToken,
        adminTelegramId,
        `🤖 *[TEST PREVIEW - BOT DIRECT MESSAGE]*\n\n${messageText}`,
        mediaUrl,
        mediaType,
        false
      );
      const chRes = await sendTelegramMessage(
        botToken,
        adminTelegramId,
        `📢 *[TEST PREVIEW - CHANNEL LAYOUT]*\n\n${messageText}`,
        mediaUrl,
        mediaType,
        true
      );
      if (botRes.ok || chRes.ok) {
        res.json({ success: true, message: 'Test previews (Bot + Channel) sent to your Telegram chat!' });
      } else {
        res.status(500).json({ error: botRes.error || chRes.error || 'Failed to send test preview' });
      }
    } else {
      const isChannel = post.send_to === 'channel';
      const label = isChannel ? 'CHANNEL LAYOUT' : 'BOT DIRECT MESSAGE';
      const result = await sendTelegramMessage(
        botToken,
        adminTelegramId,
        `🧪 *[TEST PREVIEW - ${label}]*\n\n${messageText}`,
        mediaUrl,
        mediaType,
        isChannel
      );
      if (result.ok) {
        res.json({ success: true, message: `Test preview (${label}) sent to your Telegram chat!` });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send test preview' });
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Test send exception' });
  }
});

router.post('/:id/send', validateTelegramAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: post } = await supabase.from('broadcast_posts').select('status').eq('id', id).single();
  if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
  if (post.status === 'sending') { res.status(400).json({ error: 'Already sending' }); return; }
  if (post.status === 'sent') { res.status(400).json({ error: 'Already sent' }); return; }

  res.json({ success: true, message: 'Broadcast started' });
  executeBroadcast(id).catch(e => console.error('[Broadcast Send]', e));
});

export default router;
