import { Context } from 'grammy';
import { startDeposit, handleMethodSelect, cancelDeposit, handleCopyAccount } from './deposit';

export async function handleCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data || '';

  if (data === 'btn_invite') {
    await ctx.answerCallbackQuery();
    const user = ctx.from!;
    const inviteLink = `https://t.me/ChoiceBingo_bot?start=ref_${user.id}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('ðŸŽ® Play ADWA Bingo with me! Join and win together! ðŸŽ±')}`;

    await ctx.reply(
      `ðŸ‘¥ *Your Personal Invite Link*\n\n` +
      `\`${inviteLink}\`\n\n` +
      `ðŸ“Œ Share this link with your friends! When they join and make their *first deposit*, you earn *10% bonus* in your wallet! ðŸŽ`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'ðŸ“¤ Share with Friends', url: shareUrl }],
          ],
        },
      }
    );
    return;
  }

  if (data === 'btn_deposit') {
    await startDeposit(ctx);
    return;
  }

  if (data.startsWith('dep_method_')) {
    const methodId = data.replace('dep_method_', '');
    await handleMethodSelect(ctx, methodId);
    return;
  }

  // Copy account number â†’ show popup
  if (data.startsWith('dep_copy_')) {
    const accountNumber = data.replace('dep_copy_', '');
    await handleCopyAccount(ctx, accountNumber);
    return;
  }

  if (data === 'dep_cancel') {
    await cancelDeposit(ctx);
    return;
  }

  await ctx.answerCallbackQuery();
}
