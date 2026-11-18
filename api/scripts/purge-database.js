// Purge old finished bingo players and games to immediately free up Supabase storage
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runPurge() {
  console.log('🧹 Starting cleanup of finished bingo_players and bingo_games...');

  try {
    // 1. Get all finished/cancelled games
    const { data: games, error: gErr } = await supabase
      .from('bingo_games')
      .select('id')
      .or('status.eq.finished,status.eq.cancelled');

    if (gErr) {
      console.error('Error fetching games:', gErr.message);
    } else {
      console.log(`Found ${games?.length || 0} finished/cancelled games to purge.`);
      const ids = (games || []).map(g => g.id);

      // Delete in batches of 100
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        await supabase.from('bingo_players').delete().in('game_id', batch);
        await supabase.from('bingo_games').delete().in('id', batch);
        console.log(`Purged batch ${Math.floor(i / 100) + 1} of ${Math.ceil(ids.length / 100)}`);
      }
    }

    // 2. Also delete any orphan bingo_players older than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();
    const { error: pErr } = await supabase.from('bingo_players').delete().lte('created_at', fiveMinAgo);
    if (pErr) console.warn('Orphan players delete notice:', pErr.message);

    console.log('✅ Cleanup complete! Database storage has been reclaimed.');
  } catch (err) {
    console.error('Purge error:', err);
  }
}

runPurge();
