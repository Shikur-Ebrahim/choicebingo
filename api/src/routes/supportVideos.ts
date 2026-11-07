import { Router, Response } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

export const SUPPORT_VIDEO_CATEGORIES = [
  'how_to_use',
  'how_to_play',
  'deposit',
  'withdraw',
  'invite',
  'transfer',
] as const;

export type SupportVideoCategory = (typeof SUPPORT_VIDEO_CATEGORIES)[number];

// Helper to slugify video_key if not manually supplied
function generateVideoKey(title: string, category: string): string {
  const clean = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .slice(0, 40);
  return `${category}_${clean || 'vid'}_${Date.now().toString().slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/support-videos — Public endpoint for players
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res: Response) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('support_videos')
      .select('id, category, title, description, video_url, video_key, thumbnail_url, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && typeof category === 'string' && SUPPORT_VIDEO_CATEGORIES.includes(category as any)) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Support Videos Fetch Error]', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, videos: data || [] });
  } catch (err: any) {
    console.error('[Support Videos Error]', err);
    res.status(500).json({ error: 'Failed to fetch support videos' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/support-videos/admin/all — Admin list all videos with stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/all', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: user } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();

    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { data: videos, error } = await supabase
      .from('support_videos')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Support Videos Fetch Error]', error);
      res.status(500).json({ error: error.message });
      return;
    }

    const allVideos = videos || [];

    // Aggregate category counts
    const counts: Record<string, number> = {
      all: allVideos.length,
      how_to_use: 0,
      how_to_play: 0,
      deposit: 0,
      withdraw: 0,
      invite: 0,
      transfer: 0,
      active: 0,
    };

    for (const v of allVideos) {
      if (counts[v.category] !== undefined) counts[v.category]++;
      if (v.is_active) counts.active++;
    }

    res.json({
      success: true,
      videos: allVideos,
      counts,
      categories: SUPPORT_VIDEO_CATEGORIES,
    });
  } catch (err: any) {
    console.error('[Admin Support Videos Error]', err);
    res.status(500).json({ error: 'Failed to fetch admin support videos' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/support-videos/admin — Create a new video
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: user } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();

    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const {
      category,
      title,
      description,
      video_url,
      video_key,
      thumbnail_url,
      is_active,
      sort_order,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (!video_url || typeof video_url !== 'string' || !video_url.trim()) {
      res.status(400).json({ error: 'Video URL is required' });
      return;
    }

    if (!category || !SUPPORT_VIDEO_CATEGORIES.includes(category as any)) {
      res.status(400).json({
        error: `Invalid category. Must be one of: ${SUPPORT_VIDEO_CATEGORIES.join(', ')}`,
      });
      return;
    }

    const finalKey = (video_key && typeof video_key === 'string' && video_key.trim())
      ? video_key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : generateVideoKey(title, category);

    const payload = {
      category,
      title: title.trim(),
      description: description ? description.trim() : null,
      video_url: video_url.trim(),
      video_key: finalKey,
      thumbnail_url: thumbnail_url ? thumbnail_url.trim() : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      sort_order: !isNaN(Number(sort_order)) ? Number(sort_order) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('support_videos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Insert Support Video Error]', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, video: data, message: 'Video created successfully' });
  } catch (err: any) {
    console.error('[Create Support Video Error]', err);
    res.status(500).json({ error: 'Failed to create support video' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /api/support-videos/admin/:id — Update a video
// ─────────────────────────────────────────────────────────────────────────────
router.put('/admin/:id', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: user } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();

    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const {
      category,
      title,
      description,
      video_url,
      video_key,
      thumbnail_url,
      is_active,
      sort_order,
    } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (video_url !== undefined) updates.video_url = video_url.trim();
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url ? thumbnail_url.trim() : null;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);

    if (category !== undefined) {
      if (!SUPPORT_VIDEO_CATEGORIES.includes(category as any)) {
        res.status(400).json({
          error: `Invalid category. Must be one of: ${SUPPORT_VIDEO_CATEGORIES.join(', ')}`,
        });
        return;
      }
      updates.category = category;
    }

    if (video_key !== undefined) {
      updates.video_key = video_key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }

    const { data, error } = await supabase
      .from('support_videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Update Support Video Error]', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, video: data, message: 'Video updated successfully' });
  } catch (err: any) {
    console.error('[Update Support Video Error]', err);
    res.status(500).json({ error: 'Failed to update support video' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATCH /api/support-videos/admin/:id/toggle — Quick Active Toggle
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/toggle', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: user } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();

    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { data: current } = await supabase.from('support_videos').select('is_active').eq('id', id).single();
    if (!current) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const nextState = !current.is_active;
    const { data, error } = await supabase
      .from('support_videos')
      .update({ is_active: nextState, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, video: data, message: `Video ${nextState ? 'activated' : 'deactivated'}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Toggle failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE /api/support-videos/admin/:id — Delete a video
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/admin/:id', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: user } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();

    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { error } = await supabase.from('support_videos').delete().eq('id', id);

    if (error) {
      console.error('[Delete Support Video Error]', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Support Video Error]', err);
    res.status(500).json({ error: 'Failed to delete support video' });
  }
});

export default router;
