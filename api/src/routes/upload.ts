import { Router } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { getPresignedUploadUrl, uploadToR2 } from '../services/r2';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/upload/direct
 * Direct image upload via base64 buffer to R2 (bypasses browser CORS preflight issues)
 * Body: { filename: "logo.png", contentType: "image/png", base64: "..." }
 */
router.post('/direct', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { filename, contentType, base64 } = req.body;

  if (!filename || !contentType || !base64) {
    res.status(400).json({ error: 'filename, contentType, and base64 are required' });
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(contentType)) {
    res.status(400).json({ error: 'Only image files are allowed' });
    return;
  }

  const telegramId = req.telegramUser!.id.toString();
  const ext = filename.split('.').pop() || 'png';
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const key = `users/${telegramId}/${uniqueId}.${ext}`;

  try {
    const base64Data = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
    const buffer = Buffer.from(base64Data, 'base64');

    const publicUrl = await uploadToR2(key, buffer, contentType);
    res.json({ publicUrl, key });
  } catch (err: any) {
    console.error('Direct upload failed:', err);
    res.status(500).json({ error: err.message || 'Direct upload failed' });
  }
});

/**
 * POST /api/upload/presign
 * Returns a pre-signed R2 URL so the Mini App can upload images directly
 * Body: { filename: "photo.jpg", contentType: "image/jpeg" }
 */
router.post('/presign', validateTelegramAuth, async (req: AuthRequest, res) => {
  const { filename, contentType } = req.body;

  if (!filename || !contentType) {
    res.status(400).json({ error: 'filename and contentType are required' });
    return;
  }

  // Only allow image types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(contentType)) {
    res.status(400).json({ error: 'Only image files are allowed' });
    return;
  }

  const telegramId = req.telegramUser!.id.toString();
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueId = crypto.randomBytes(8).toString('hex');

  // Key format: users/<telegram_id>/<random>.jpg
  const key = `users/${telegramId}/${uniqueId}.${ext}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
