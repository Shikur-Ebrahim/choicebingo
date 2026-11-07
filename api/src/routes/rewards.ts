import { Router, Response } from 'express';
import { AuthRequest, validateTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

// Default fallback reward definitions
const DEFAULT_CAMPAIGNS = [
  {
    id: 'total_games',
    title: '500 Games Milestone',
    title_am: 'የ 500 ጨዋታዎች ማይልስቶን',
    description: 'Reach 500 total games and claim 2% of your total wagered stake as Bonus Balance!',
    description_am: '500 ጠቅላላ ጨዋታዎችን በመድረስ የጠቅላላ ውርርድዎን 2% ቦነስ ይውሰዱ!',
    target_value: 500,
    reward_type: 'percentage_of_stake',
    reward_value: 2, // 2%
    max_winners: 3,
    current_claims: 0,
    is_active: true,
    round_number: 1,
  },
  {
    id: 'invitation_reward',
    title: '5,000 ETB Inviter Milestone',
    title_am: 'የ 5,000 ብር ግብዣ ማይልስቶን',
    description: 'Earn 5,000 ETB in invited rewards to unlock a flat 500 ETB Bonus Balance!',
    description_am: 'በግብዣ 5,000 ብር በማግኘት 500 ብር ተጨማሪ ቦነስ ይውሰዱ!',
    target_value: 5000,
    reward_type: 'fixed',
    reward_value: 500, // 500 ETB
    max_winners: 5,
    current_claims: 0,
    is_active: true,
    round_number: 1,
  },
  {
    id: 'gursha',
    title: 'Community Gursha Reward',
    title_am: 'የማህበረሰብ ጉርሻ ቦነስ',
    description: 'Flash reward for the first 100 active players! Claim your 10 ETB instant bonus.',
    description_am: 'የመጀመሪያዎቹ 100 ተጠቃሚዎች የ 10 ብር ፈጣን የጉርሻ ቦነስ ይውሰዱ!',
    target_value: 0, // Click task
    reward_type: 'fixed',
    reward_value: 10, // 10 ETB per user (1000 ETB total pool)
    max_winners: 100,
    current_claims: 0,
    is_active: true,
    round_number: 1,
  },
];

// Helper to ensure default campaigns exist in database
async function getOrSeedCampaigns() {
  const { data, error } = await supabase.from('reward_campaigns').select('*').order('created_at', { ascending: true });
  if (error || !data || data.length === 0) {
    // Attempt seeding
    for (const c of DEFAULT_CAMPAIGNS) {
      await supabase.from('reward_campaigns').upsert(c, { onConflict: 'id' }).select();
    }
    const { data: seeded } = await supabase.from('reward_campaigns').select('*').order('created_at', { ascending: true });
    return seeded && seeded.length > 0 ? seeded : DEFAULT_CAMPAIGNS;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/rewards — Fetch campaigns, user progress, and eligibility
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();

    // 1. Fetch user data (total_games, total_stake, invited_reward, bonus_balance)
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id, username, first_name, total_games, total_stake, invited_reward, bonus_balance')
      .eq('telegram_id', telegramId)
      .single();

    const totalGames = Number(user?.total_games || 0);
    const totalStake = Number(user?.total_stake || 0);
    const invitedReward = Number(user?.invited_reward || 0);

    // 2. Fetch campaigns
    const campaigns = await getOrSeedCampaigns();

    // 3. Fetch user claims for these campaigns
    const { data: userClaims } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('telegram_id', telegramId);

    const claimsMap: Record<string, any> = {};
    for (const cl of userClaims || []) {
      claimsMap[`${cl.campaign_id}_${cl.round_number}`] = cl;
    }

    // 4. Fetch recent public claimers for social proof (last 10 claims)
    const { data: recentClaims } = await supabase
      .from('reward_claims')
      .select('campaign_id, round_number, first_name, username, claim_amount, claim_order, claimed_at')
      .order('claimed_at', { ascending: false })
      .limit(10);

    // 5. Enrich each campaign with user status
    const enriched = campaigns.map((c: any) => {
      const claimKey = `${c.id}_${c.round_number}`;
      const existingClaim = claimsMap[claimKey];
      const hasClaimed = !!existingClaim;

      let userProgress = 0;
      let targetValue = Number(c.target_value || 0);
      let potentialReward = Number(c.reward_value || 0);

      if (c.id === 'total_games') {
        userProgress = totalGames;
        potentialReward = Number((totalStake * (Number(c.reward_value || 2) / 100)).toFixed(2));
      } else if (c.id === 'invitation_reward') {
        userProgress = invitedReward;
        potentialReward = Number(c.reward_value || 500);
      } else if (c.id === 'gursha') {
        userProgress = 1;
        targetValue = 1;
        potentialReward = Number(c.reward_value || 10);
      }

      const isCriteriaMet = userProgress >= targetValue;
      const isSlotsFull = Number(c.current_claims || 0) >= Number(c.max_winners || 1);
      const isEligible = c.is_active && !hasClaimed && !isSlotsFull && isCriteriaMet;

      return {
        ...c,
        user_progress: userProgress,
        target_value: targetValue,
        potential_reward: potentialReward,
        has_claimed: hasClaimed,
        claim_info: existingClaim || null,
        is_eligible: isEligible,
        is_slots_full: isSlotsFull,
        spots_left: Math.max(0, Number(c.max_winners || 0) - Number(c.current_claims || 0)),
      };
    });

    res.json({
      success: true,
      campaigns: enriched,
      user_stats: {
        total_games: totalGames,
        total_stake: totalStake,
        invited_reward: invitedReward,
        bonus_balance: Number(user?.bonus_balance || 0),
      },
      recent_claimers: recentClaims || [],
    });
  } catch (err: any) {
    console.error('[Rewards Error]', err);
    res.status(500).json({ error: 'Failed to fetch rewards', details: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/rewards/claim — Claim an eligible reward
// ─────────────────────────────────────────────────────────────────────────────
router.post('/claim', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { campaign_id } = req.body;

    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    // 1. Fetch user
    const { data: user } = await supabase
      .from('users')
      .select('telegram_id, username, first_name, total_games, total_stake, invited_reward, bonus_balance')
      .eq('telegram_id', telegramId)
      .single();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 2. Fetch campaign
    const { data: campaign, error: cErr } = await supabase
      .from('reward_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (cErr || !campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (!campaign.is_active) {
      res.status(400).json({ error: 'This reward campaign is currently closed.' });
      return;
    }

    const maxWinners = Number(campaign.max_winners || 0);
    const currentClaims = Number(campaign.current_claims || 0);

    if (currentClaims >= maxWinners) {
      res.status(400).json({ error: 'All reward spots for this round have already been claimed!' });
      return;
    }

    // 3. Check if user already claimed in this round
    const { data: existingClaim } = await supabase
      .from('reward_claims')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('round_number', campaign.round_number)
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (existingClaim) {
      res.status(400).json({ error: 'You have already claimed this bonus for the current round!' });
      return;
    }

    // 4. Validate criteria
    const totalGames = Number(user.total_games || 0);
    const totalStake = Number(user.total_stake || 0);
    const invitedReward = Number(user.invited_reward || 0);
    let rewardAmount = 0;

    if (campaign.id === 'total_games') {
      if (totalGames < Number(campaign.target_value || 500)) {
        res.status(400).json({
          error: `You need at least ${campaign.target_value} games played to claim this bonus. You have ${totalGames}.`,
        });
        return;
      }
      rewardAmount = Number((totalStake * (Number(campaign.reward_value || 2) / 100)).toFixed(2));
      if (rewardAmount <= 0) rewardAmount = 10; // Minimum baseline
    } else if (campaign.id === 'invitation_reward') {
      if (invitedReward < Number(campaign.target_value || 5000)) {
        res.status(400).json({
          error: `You need at least ${campaign.target_value} ETB in referral rewards to claim this bonus. You have ${invitedReward} ETB.`,
        });
        return;
      }
      rewardAmount = Number(campaign.reward_value || 500);
    } else if (campaign.id === 'gursha') {
      rewardAmount = Number(campaign.reward_value || 10);
    } else {
      rewardAmount = Number(campaign.reward_value || 10);
    }

    const nextOrder = currentClaims + 1;

    // 5. Record claim
    const { data: claimInsert, error: claimErr } = await supabase
      .from('reward_claims')
      .insert({
        campaign_id: campaign.id,
        round_number: campaign.round_number,
        telegram_id: telegramId,
        username: user.username || req.telegramUser!.username || '',
        first_name: user.first_name || req.telegramUser!.first_name || '',
        claim_amount: rewardAmount,
        claim_order: nextOrder,
      })
      .select()
      .single();

    if (claimErr) {
      console.error('[Reward Claim Insert Error]', claimErr);
      res.status(400).json({ error: 'Claim failed or already submitted. Please refresh.' });
      return;
    }

    // 6. Increment current_claims on campaign
    await supabase
      .from('reward_campaigns')
      .update({
        current_claims: nextOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    // 7. Credit user's bonus_balance
    const currentBonus = Number(user.bonus_balance || 0);
    const newBonusBalance = Number((currentBonus + rewardAmount).toFixed(2));
    await supabase
      .from('users')
      .update({ bonus_balance: newBonusBalance })
      .eq('telegram_id', telegramId);

    // 8. Fire-and-forget Telegram Notification
    const botToken = process.env.BOT_TOKEN;
    if (botToken) {
      const claimMsg = `🎁 *Reward Bonus Claimed!*\n\nCongratulations! You claimed the *${campaign.title}* reward!\n\n💰 *+${rewardAmount.toLocaleString('en-US')} ETB* has been added directly to your Bonus Balance (Spot #${nextOrder}).\n\n🎉 Keep playing and enjoying Choice Bingo!`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: claimMsg,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(3000),
      }).catch((e) => console.error('[Reward Notify Error]', e?.message));
    }

    res.json({
      success: true,
      message: `Successfully claimed ${rewardAmount} ETB bonus!`,
      reward_amount: rewardAmount,
      claim_order: nextOrder,
      new_bonus_balance: newBonusBalance,
      claim: claimInsert,
    });
  } catch (err: any) {
    console.error('[Claim Error]', err);
    res.status(500).json({ error: 'Failed to process claim', details: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN: GET /api/rewards/admin/all — View all campaigns + claims history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/all', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: adminUser } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'worker')) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const campaigns = await getOrSeedCampaigns();

    const { data: claims } = await supabase
      .from('reward_claims')
      .select('*')
      .order('claimed_at', { ascending: false })
      .limit(100);

    res.json({
      success: true,
      campaigns,
      claims: claims || [],
    });
  } catch (err: any) {
    console.error('[Admin Rewards Error]', err);
    res.status(500).json({ error: 'Failed to fetch admin rewards', details: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN: PUT /api/rewards/admin/campaign/:id — Update campaign settings
// ─────────────────────────────────────────────────────────────────────────────
router.put('/admin/campaign/:id', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: adminUser } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
    if (!adminUser || adminUser.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { target_value, reward_value, max_winners, is_active } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (target_value !== undefined) updates.target_value = Number(target_value);
    if (reward_value !== undefined) updates.reward_value = Number(reward_value);
    if (max_winners !== undefined) updates.max_winners = Number(max_winners);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('reward_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, campaign: data });
  } catch (err: any) {
    console.error('[Admin Campaign Update Error]', err);
    res.status(500).json({ error: 'Update failed', details: err?.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN: POST /api/rewards/admin/campaign/:id/reset — Start New Round
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/campaign/:id/reset', validateTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser!.id.toString();
    const { data: adminUser } = await supabase.from('users').select('role').eq('telegram_id', telegramId).single();
    if (!adminUser || adminUser.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const { data: campaign } = await supabase.from('reward_campaigns').select('round_number').eq('id', id).single();
    const currentRound = Number(campaign?.round_number || 1);

    const { data, error } = await supabase
      .from('reward_campaigns')
      .update({
        round_number: currentRound + 1,
        current_claims: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: `Round ${currentRound + 1} started! Claims reset to 0.`, campaign: data });
  } catch (err: any) {
    console.error('[Admin Campaign Reset Error]', err);
    res.status(500).json({ error: 'Reset failed', details: err?.message });
  }
});

export default router;
