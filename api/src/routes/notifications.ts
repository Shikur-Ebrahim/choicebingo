import { Router, Response } from 'express';
import { AuthRequest, optionalTelegramAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';

const router = Router();

export interface NotificationItem {
  id: string;
  type: 'broadcast' | 'deposit' | 'withdrawal' | 'win' | 'reward';
  title: string;
  title_am?: string;
  message: string;
  message_am?: string;
  created_at: string;
  status: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple';
  amount?: number;
  media_url?: string;
  action_url?: string;
  action_text?: string;
}

// GET /api/notifications — fetch aggregated notifications for user + broadcasts
router.get('/', optionalTelegramAuth, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.telegramUser?.id ? req.telegramUser.id.toString() : null;
    const notifications: NotificationItem[] = [];

    // 1. Always fetch public published broadcasts (admin announcements to bot/channel)
    try {
      const { data: broadcasts } = await supabase
        .from('broadcast_posts')
        .select('id, title, content, media_url, button_text, button_url, status, created_at, scheduled_at')
        .in('status', ['published', 'sent'])
        .order('created_at', { ascending: false })
        .limit(10);

      for (const b of broadcasts || []) {
        notifications.push({
          id: `broadcast_${b.id}`,
          type: 'broadcast',
          title: b.title || 'Choice Bingo Notice 📢',
          title_am: b.title || 'የ Choice Bingo ማስታወቂያ 📢',
          message: b.content || '',
          message_am: b.content || '',
          created_at: b.scheduled_at || b.created_at,
          status: 'info',
          media_url: b.media_url || undefined,
          action_url: b.button_url || undefined,
          action_text: b.button_text || undefined,
        });
      }
    } catch (bErr) {
      console.error('[Notifications] Error fetching broadcasts:', bErr);
    }

    // If unauthenticated guest, return broadcasts
    if (!telegramId) {
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json({ success: true, notifications });
      return;
    }

    // 2. Fetch User Deposits (Approved, Rejected, Pending)
    try {
      const { data: deposits } = await supabase
        .from('deposits')
        .select('id, amount, status, created_at, updated_at, deposit_methods(name, type)')
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(15);

      for (const d of deposits || []) {
        const methodName = (d.deposit_methods as any)?.name || 'Bank Transfer';
        const formattedAmount = Number(d.amount || 0).toLocaleString('en-US');

        if (d.status === 'approved') {
          notifications.push({
            id: `deposit_${d.id}_approved`,
            type: 'deposit',
            title: `Deposit Approved (+${formattedAmount} ETB)`,
            title_am: `ተቀማጭ ጸድቋል (+${formattedAmount} ብር)`,
            message: `Your deposit of ${formattedAmount} ETB via ${methodName} was verified and credited to your wallet balance.`,
            message_am: `በ${methodName} ያስገቡት የ ${formattedAmount} ብር ተቀማጭ ተረጋግጦ ወደ ዋና ሂሳብዎ ገብቷል።`,
            created_at: d.updated_at || d.created_at,
            status: 'success',
            amount: Number(d.amount),
          });
        } else if (d.status === 'rejected') {
          notifications.push({
            id: `deposit_${d.id}_rejected`,
            type: 'deposit',
            title: `Deposit Rejected (${formattedAmount} ETB)`,
            title_am: `ተቀማጭ ውድቅ ተደርጓል (${formattedAmount} ብር)`,
            message: `Your deposit request of ${formattedAmount} ETB was rejected. Please check your transaction details or contact support.`,
            message_am: `የ ${formattedAmount} ብር ተቀማጭ ጥያቄዎ ውድቅ ተደርጓል። ጥያቄ ካለዎት የደንበኞች አገልግሎትን ያነጋግሩ።`,
            created_at: d.updated_at || d.created_at,
            status: 'danger',
            amount: Number(d.amount),
          });
        } else if (d.status === 'pending') {
          notifications.push({
            id: `deposit_${d.id}_pending`,
            type: 'deposit',
            title: `Deposit Under Review (${formattedAmount} ETB)`,
            title_am: `ተቀማጭ በግምገማ ላይ ነው (${formattedAmount} ብር)`,
            message: `Your deposit request of ${formattedAmount} ETB via ${methodName} is being reviewed by operators.`,
            message_am: `በ${methodName} ያስገቡት የ ${formattedAmount} ብር ተቀማጭ ጥያቄ በሰራተኞች በመረጋገጥ ላይ ነው።`,
            created_at: d.created_at,
            status: 'warning',
            amount: Number(d.amount),
          });
        }
      }
    } catch (dErr) {
      console.error('[Notifications] Error fetching deposits:', dErr);
    }

    // 3. Fetch User Withdrawals (Approved/Sent, Rejected, Pending)
    try {
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, amount, status, account_number, created_at, updated_at, withdrawal_methods(name, type)')
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(15);

      for (const w of withdrawals || []) {
        const wMethodName = (w.withdrawal_methods as any)?.name || 'Payout';
        const formattedAmount = Number(w.amount || 0).toLocaleString('en-US');

        if (w.status === 'approved' || w.status === 'sent') {
          notifications.push({
            id: `withdrawal_${w.id}_approved`,
            type: 'withdrawal',
            title: `Withdrawal Sent (${formattedAmount} ETB)`,
            title_am: `ገንዘብ ወጪ ተልኳል (${formattedAmount} ብር)`,
            message: `Your payout of ${formattedAmount} ETB via ${wMethodName} (${w.account_number || ''}) has been successfully processed and sent.`,
            message_am: `በ${wMethodName} (${w.account_number || ''}) የጠየቁት የ ${formattedAmount} ብር ወጪ በተሳካ ሁኔታ ተልኮልዎታል።`,
            created_at: w.updated_at || w.created_at,
            status: 'success',
            amount: Number(w.amount),
          });
        } else if (w.status === 'rejected') {
          notifications.push({
            id: `withdrawal_${w.id}_rejected`,
            type: 'withdrawal',
            title: `Withdrawal Rejected (${formattedAmount} ETB)`,
            title_am: `የወጪ ጥያቄ ውድቅ ተደርጓል (${formattedAmount} ብር)`,
            message: `Your withdrawal request of ${formattedAmount} ETB was rejected. The funds have been returned to your wallet balance.`,
            message_am: `የ ${formattedAmount} ብር የወጪ ጥያቄዎ ውድቅ ተደርጓል። ገንዘቡ ወደ ዋና ሂሳብዎ ተመልሷል።`,
            created_at: w.updated_at || w.created_at,
            status: 'danger',
            amount: Number(w.amount),
          });
        } else if (w.status === 'pending') {
          notifications.push({
            id: `withdrawal_${w.id}_pending`,
            type: 'withdrawal',
            title: `Withdrawal In Queue (${formattedAmount} ETB)`,
            title_am: `የወጪ ጥያቄ በሂደት ላይ (${formattedAmount} ብር)`,
            message: `Your withdrawal request of ${formattedAmount} ETB via ${wMethodName} is currently queued for transfer.`,
            message_am: `በ${wMethodName} የጠየቁት የ ${formattedAmount} ብር ወጪ በሰራተኞች በመተላለፍ ሂደት ላይ ነው።`,
            created_at: w.created_at,
            status: 'warning',
            amount: Number(w.amount),
          });
        }
      }
    } catch (wErr) {
      console.error('[Notifications] Error fetching withdrawals:', wErr);
    }

    // 4. Fetch Bingo Game Wins
    try {
      const { data: wins } = await supabase
        .from('bingo_games')
        .select('id, stake, winner_prize, finished_at, created_at')
        .eq('winner_telegram_id', telegramId)
        .eq('status', 'finished')
        .order('finished_at', { ascending: false })
        .limit(10);

      for (const g of wins || []) {
        const prizeAmount = Number(g.winner_prize || 0).toLocaleString('en-US');
        notifications.push({
          id: `win_${g.id}`,
          type: 'win',
          title: `🎉 BINGO WINNER! (+${prizeAmount} ETB)`,
          title_am: `🎉 የቢንጎ አሸናፊ! (+${prizeAmount} ብር)`,
          message: `Congratulations! You won the Bingo match with a stake of ${g.stake} ETB and claimed ${prizeAmount} ETB Derash prize!`,
          message_am: `እንኳን ደስ አለዎት! በ ${g.stake} ብር መደብ የነበረውን የቢንጎ ጨዋታ አሸንፈው የ ${prizeAmount} ብር ደራሽ ሽልማት አግኝተዋል!`,
          created_at: g.finished_at || g.created_at,
          status: 'gold',
          amount: Number(g.winner_prize),
        });
      }
    } catch (gErr) {
      console.error('[Notifications] Error fetching game wins:', gErr);
    }

    // 5. Fetch Reward Claims (Gursha / Milestones)
    try {
      const { data: claims } = await supabase
        .from('reward_claims')
        .select('id, campaign_id, claim_amount, claim_order, claimed_at')
        .eq('telegram_id', telegramId)
        .order('claimed_at', { ascending: false })
        .limit(10);

      for (const r of claims || []) {
        const claimAmount = Number(r.claim_amount || 0).toLocaleString('en-US');
        const campaignName = r.campaign_id === 'gursha' ? 'Community Gursha' : 'Milestone Reward';
        const campaignNameAm = r.campaign_id === 'gursha' ? 'የማህበረሰብ ጉርሻ' : 'የማይልስቶን ቦነስ';

        notifications.push({
          id: `reward_${r.id}`,
          type: 'reward',
          title: `🎁 ${campaignName} (+${claimAmount} ETB)`,
          title_am: `🎁 ${campaignNameAm} (+${claimAmount} ብር)`,
          message: `You claimed ${claimAmount} ETB bonus for ${campaignName} (Spot #${r.claim_order})!`,
          message_am: `ለ${campaignNameAm} የ ${claimAmount} ብር ቦነስዎን ወስደዋል (ቦታ #${r.claim_order})!`,
          created_at: r.claimed_at,
          status: 'purple',
          amount: Number(r.claim_amount),
        });
      }
    } catch (rErr) {
      console.error('[Notifications] Error fetching rewards:', rErr);
    }

    // Sort all by created_at descending (newest first)
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      notifications,
    });
  } catch (err: any) {
    console.error('[Notifications Router Error]', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;
