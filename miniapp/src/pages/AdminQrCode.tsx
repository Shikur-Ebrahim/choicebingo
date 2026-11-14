import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Download, Copy, ExternalLink, QrCode, Sparkles, CheckCircle2, Sliders, RefreshCw, Send, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import QRCode from 'qrcode';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AdminQrCode() {
  const { user } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Customization options
  const [qrMode, setQrMode] = useState<'pwa' | 'telegram'>('pwa');
  const [pwaInstallUrl, setPwaInstallUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/install`;
    }
    return 'https://choicebingo.com/install';
  });
  const [botUsername, setBotUsername] = useState('choicebingo_bot');
  const [roomTitle, setRoomTitle] = useState('OFFICIAL CHOICE BINGO');
  const [startParam, setStartParam] = useState('qr');
  const [devPhone, setDevPhone] = useState('0904174741');
  const [devTitle, setDevTitle] = useState('ለማሰራት');
  const [devCallToAction, setDevCallToAction] = useState('ያናግሩኝ');
  const [developerName, setDeveloperName] = useState('Developer Shikur Ebrahim');
  const [showDevContact, setShowDevContact] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sendingTg, setSendingTg] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>('');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const getFullTelegramUrl = useCallback(() => {
    const cleanBot = botUsername.replace(/^@/, '').trim() || 'ChoiceBingo_bot';
    const cleanParam = startParam.trim();
    if (cleanParam) {
      return `https://t.me/${cleanBot}?start=${encodeURIComponent(cleanParam)}`;
    }
    return `https://t.me/${cleanBot}`;
  }, [botUsername, startParam]);

  const getTargetQrUrl = useCallback(() => {
    if (qrMode === 'pwa') {
      const cleanUrl = pwaInstallUrl.trim();
      if (cleanUrl) return cleanUrl;
      if (typeof window !== 'undefined' && window.location.origin) {
        return `${window.location.origin}/install`;
      }
      return 'https://choicebingo.com/install';
    }
    return getFullTelegramUrl();
  }, [qrMode, pwaInstallUrl, getFullTelegramUrl]);

  // Helper function to draw rounded rectangles on canvas
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Render High-Res Canva-style Luxury Poster onto Canvas
  const renderPoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HD Canvas Dimensions (2:3 Aspect Ratio)
    const W = 1200;
    const H = 1800;
    canvas.width = W;
    canvas.height = H;

    // 1. Luxury Cream Background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100);
    bgGrad.addColorStop(0, '#FCFBF7');
    bgGrad.addColorStop(0.7, '#FAF5EB');
    bgGrad.addColorStop(1, '#F3EAD8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Double Gold Decorative Borders
    const goldColor = '#C5A059';
    const lightGold = '#DFCA96';

    // Outer Border
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Inner Fine Border
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // Corner Diamond Accents
    const drawDiamond = (cx: number, cy: number, size: number) => {
      ctx.fillStyle = goldColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fill();
    };

    drawDiamond(36, 36, 8);
    drawDiamond(W - 36, 36, 8);
    drawDiamond(36, H - 36, 8);
    drawDiamond(W - 36, H - 36, 8);

    drawDiamond(48, 48, 4);
    drawDiamond(W - 48, 48, 4);
    drawDiamond(48, H - 48, 4);
    drawDiamond(W - 48, H - 48, 4);

    // 3. Top Crown & Crest Emblem
    const crestY = 110;

    // Crown
    ctx.fillStyle = '#C5A059';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 32, crestY - 14);
    ctx.lineTo(W / 2 - 40, crestY - 36);
    ctx.lineTo(W / 2 - 16, crestY - 24);
    ctx.lineTo(W / 2, crestY - 44);
    ctx.lineTo(W / 2 + 16, crestY - 24);
    ctx.lineTo(W / 2 + 40, crestY - 36);
    ctx.lineTo(W / 2 + 32, crestY - 14);
    ctx.closePath();
    ctx.fill();

    // Crest Circle
    ctx.beginPath();
    ctx.arc(W / 2, crestY + 16, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D4AF37';
    ctx.stroke();

    // Crest Monogram (CB)
    ctx.fillStyle = '#E5C578';
    ctx.font = '900 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CB', W / 2, crestY + 18);

    // Decorative Flourish Wings beside crest
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 50, crestY + 16);
    ctx.bezierCurveTo(W / 2 - 90, crestY + 2, W / 2 - 120, crestY + 24, W / 2 - 140, crestY + 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + 50, crestY + 16);
    ctx.bezierCurveTo(W / 2 + 90, crestY + 2, W / 2 + 120, crestY + 24, W / 2 + 140, crestY + 16);
    ctx.stroke();

    // 4. Main Title: CHOICE BINGO
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 68px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CHOICE BINGO', W / 2, 245);

    // 5. Official Subtitle: OFFICIAL CHOICE BINGO
    ctx.fillStyle = '#8C6D3B';
    ctx.font = '700 17px sans-serif';
    ctx.letterSpacing = '2px';
    const subText = (roomTitle || (qrMode === 'pwa' ? 'OFFICIAL CHOICE BINGO • PWA APP' : 'OFFICIAL CHOICE BINGO')).toUpperCase();
    const subWidth = ctx.measureText(subText).width;

    ctx.fillText(subText, W / 2, 285);

    // Lines beside subtitle
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 1.5;
    const lineMargin = 20;
    const lineLen = 140;
    ctx.beginPath();
    ctx.moveTo(W / 2 - subWidth / 2 - lineMargin - lineLen, 280);
    ctx.lineTo(W / 2 - subWidth / 2 - lineMargin, 280);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + subWidth / 2 + lineMargin, 280);
    ctx.lineTo(W / 2 + subWidth / 2 + lineMargin + lineLen, 280);
    ctx.stroke();

    // 6. "SCAN TO INSTALL APP" / "SCAN TO PLAY" Banner
    const s2pY = 345;
    const bannerText = qrMode === 'pwa' ? 'SCAN TO INSTALL APP' : 'SCAN TO PLAY';
    ctx.fillStyle = '#C5A059';
    ctx.font = '900 40px "Times New Roman", Georgia, serif';
    ctx.fillText(bannerText, W / 2, s2pY);

    // Decorative Arrows on left and right
    const drawArrowWing = (cx: number, cy: number, flip: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-24, -14);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-24, 14);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-32, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const arrowOffset = qrMode === 'pwa' ? 260 : 200;
    drawArrowWing(W / 2 - arrowOffset, s2pY - 12, false);
    drawArrowWing(W / 2 + arrowOffset, s2pY - 12, true);

    // 7. Gold Pill: "SCAN THE QR CODE TO Install App & Play!" (PERFECT NON-OVERLAPPING ALIGNMENT)
    const pillW = 680;
    const pillH = 58;
    const pillX = (W - pillW) / 2;
    const pillY = 380;

    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, '#F5DFB3');
    pillGrad.addColorStop(0.5, '#E9CA88');
    pillGrad.addColorStop(1, '#DFB86C');

    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 29);
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#B88E3E';
    ctx.stroke();

    // Calculate exact width of each part so they NEVER overlap
    const part1 = 'SCAN THE QR CODE TO ';
    const part2 = qrMode === 'pwa' ? 'Install App & Play!' : 'Play & Win Cash!';

    ctx.font = '800 17px sans-serif';
    const w1 = ctx.measureText(part1).width;

    ctx.font = 'italic 700 24px "Times New Roman", Georgia, serif';
    const w2 = ctx.measureText(part2).width;

    const totalPillTextW = w1 + w2;
    const startPillX = (W - totalPillTextW) / 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Draw Part 1
    ctx.fillStyle = '#543604';
    ctx.font = '800 17px sans-serif';
    ctx.fillText(part1, startPillX, pillY + pillH / 2);

    // Draw Part 2 directly after Part 1
    ctx.fillStyle = '#732E00';
    ctx.font = 'italic 700 24px "Times New Roman", Georgia, serif';
    ctx.fillText(part2, startPillX + w1, pillY + pillH / 2);

    // 8. White Rounded Frame for QR Code
    const qrCardSize = 740;
    const qrCardX = (W - qrCardSize) / 2;
    const qrCardY = 470;
    const qrCardR = 36;

    // Card shadow
    ctx.save();
    ctx.shadowColor = 'rgba(180, 140, 70, 0.22)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;

    drawRoundRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, qrCardR);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // Card Gold Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D4AF37';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, qrCardR);
    ctx.stroke();

    // 9. Generate & Draw QR Code
    const targetUrl = getTargetQrUrl();
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, targetUrl, {
      width: 660,
      margin: 1,
      color: {
        dark: '#0A0F1D',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    const qrX = qrCardX + (qrCardSize - 660) / 2;
    const qrY = qrCardY + (qrCardSize - 660) / 2;
    ctx.drawImage(qrCanvas, qrX, qrY, 660, 660);

    // 10. Center Badge on QR Code: "CHOICE BINGO"
    const badgeW = 200;
    const badgeH = 76;
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = qrCardY + qrCardSize / 2 - badgeH / 2;
    const badgeR = 18;

    // Badge Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    badgeGrad.addColorStop(0, '#E67E00');
    badgeGrad.addColorStop(1, '#D06000');
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.restore();

    // White Border on Badge
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FFFFFF';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    ctx.stroke();

    // Badge Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 19px sans-serif';
    ctx.fillText('CHOICE', W / 2, badgeY + 24);
    ctx.font = '900 24px sans-serif';
    ctx.fillText('BINGO', W / 2, badgeY + 52);

    // 11. Advanced 3D Attention-Seeker Developer Card (Replacing horizontal icons directly under QR)
    // "ለማሰራት  0904174741  ያናግሩኝ"
    const devCardW = 740;
    const devCardH = 156;
    const devCardX = (W - devCardW) / 2;
    const devCardY = 1230;
    const devCardR = 28;

    // Card Ambient Glow & 3D Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(217, 119, 6, 0.45)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;

    drawRoundRect(ctx, devCardX, devCardY, devCardW, devCardH, devCardR);
    const devGrad = ctx.createLinearGradient(devCardX, devCardY, devCardX + devCardW, devCardY + devCardH);
    devGrad.addColorStop(0, '#0F172A');
    devGrad.addColorStop(0.5, '#1E293B');
    devGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = devGrad;
    ctx.fill();
    ctx.restore();

    // Outer Polished Gold Border (3px)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D4AF37';
    drawRoundRect(ctx, devCardX, devCardY, devCardW, devCardH, devCardR);
    ctx.stroke();

    // Inner Fine Accent Border
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    drawRoundRect(ctx, devCardX + 5, devCardY + 5, devCardW - 10, devCardH - 10, devCardR - 5);
    ctx.stroke();

    // Top Header: "✨ የቢንጎ ሲስተም / ቦት ለማሰራት (Development) ✨"
    const titleClean = devTitle.trim() || 'ለማሰራት';
    ctx.font = '900 21px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif';
    ctx.fillStyle = '#FDE68A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`✨ የቢንጎ ሲስተም / ቦት ${titleClean} (Development) ✨`, W / 2, devCardY + 32);

    // Center 3D Raised Phone Button: "📞 0904174741"
    const phoneClean = devPhone.trim() || '0904174741';
    const phoneBtnW = 580;
    const phoneBtnH = 58;
    const phoneBtnX = (W - phoneBtnW) / 2;
    const phoneBtnY = devCardY + 52;
    const phoneBtnR = 29;

    // 3D Button Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    drawRoundRect(ctx, phoneBtnX, phoneBtnY, phoneBtnW, phoneBtnH, phoneBtnR);
    const phoneGrad = ctx.createLinearGradient(phoneBtnX, phoneBtnY, phoneBtnX + phoneBtnW, phoneBtnY + phoneBtnH);
    phoneGrad.addColorStop(0, '#B45309');
    phoneGrad.addColorStop(0.3, '#F59E0B');
    phoneGrad.addColorStop(0.7, '#D97706');
    phoneGrad.addColorStop(1, '#92400E');
    ctx.fillStyle = phoneGrad;
    ctx.fill();
    ctx.restore();

    // 3D Top Bevel Highlight
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FEF3C7';
    drawRoundRect(ctx, phoneBtnX, phoneBtnY, phoneBtnW, phoneBtnH, phoneBtnR);
    ctx.stroke();

    // Phone Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📞  ${phoneClean}`, W / 2, phoneBtnY + phoneBtnH / 2);

    // Bottom Call to Action: "💬 ያናግሩኝ • ስልክ ወይም ቴሌግራም" (Removed trailing rocket icon)
    const ctaClean = devCallToAction.trim() || 'ያናግሩኝ';
    ctx.font = '800 17px "Noto Sans Ethiopic", "Abyssinica SIL", sans-serif';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💬 ${ctaClean}  •  ስልክ ወይም ቴሌግራም`, W / 2, devCardY + 132);

    // 12. Script Motto
    const mottoY = 1435;
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'italic 700 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Real Players   •   Good Luck   •   Big Wins', W / 2, mottoY);

    // 13. Bot Handle / PWA Install Pill
    const botPillW = qrMode === 'pwa' ? 560 : 420;
    const botPillH = 64;
    const botPillX = (W - botPillW) / 2;
    const botPillY = 1495;

    drawRoundRect(ctx, botPillX, botPillY, botPillW, botPillH, 32);
    ctx.fillStyle = '#FAF7F0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C5A059';
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (qrMode === 'pwa') {
      let displayDomain = 'choicebingo.com/install';
      try {
        const u = new URL(targetUrl);
        displayDomain = `${u.host}/install`;
      } catch (_) {}
      ctx.font = '800 24px sans-serif';
      ctx.fillText(`📱 ${displayDomain}`, W / 2, botPillY + botPillH / 2);
    } else {
      ctx.font = '800 28px sans-serif';
      ctx.fillText(`@${botUsername.replace(/^@/, '')}`, W / 2, botPillY + botPillH / 2);
    }

    // 14. Footer Credits
    const footerY = 1595;
    ctx.fillStyle = '#8C7853';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(
      qrMode === 'pwa'
        ? 'Fast 1-Tap Mobile Install  •  No App Store Needed  •  CHOICE BINGO'
        : 'Official Partner Network  •  Powered by CHOICE BINGO',
      W / 2,
      footerY
    );

    // 15. English Developer Work Attribution
    const devAttributionY = 1648;
    ctx.fillStyle = '#6E5D3F';
    ctx.font = '700 20px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(developerName.trim() || 'Developer Shikur Ebrahim', W / 2, devAttributionY);

    // 16. Bottom Elegant Decorative Corner Arcs
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 1.5;

    // Bottom Left Arc
    ctx.beginPath();
    ctx.moveTo(48, H - 140);
    ctx.quadraticCurveTo(180, H - 48, W / 2 - 80, H - 48);
    ctx.stroke();

    // Bottom Right Arc
    ctx.beginPath();
    ctx.moveTo(W - 48, H - 140);
    ctx.quadraticCurveTo(W - 180, H - 48, W / 2 + 80, H - 48);
    ctx.stroke();

    drawDiamond(W / 2, H - 48, 6);

    // Export to Image Data URL for real <img> tag display (enables native mobile long-press "Save Image")
    try {
      const url = canvas.toDataURL('image/png', 1.0);
      setPosterUrl(url);
    } catch (e) {
      console.error('DataURL error:', e);
    }
  }, [qrMode, pwaInstallUrl, botUsername, roomTitle, startParam, devPhone, devTitle, devCallToAction, developerName, showDevContact, getTargetQrUrl]);

  useEffect(() => {
    renderPoster();
  }, [renderPoster]);

  // Method 1: Send Photo to Admin Telegram Chat (Zero-Fail for Phone Gallery Save)
  const handleSendToTelegram = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSendingTg(true);

    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const res = await fetch(`${API_URL}/admin/send-qr-poster`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ image_base64: dataUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showNotification('Poster sent to your Telegram chat! Tap photo → Save to Gallery 🖼️');
        if (typeof WebApp !== 'undefined') {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showNotification(data.error || 'Failed to send to Telegram.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Network error.', 'error');
    } finally {
      setSendingTg(false);
    }
  };

  // Method 2: Native Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          showNotification('Failed to generate image file.', 'error');
          setDownloading(false);
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `CHOICE_BINGO_QR_${botUsername.replace(/^@/, '')}.png`;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        showNotification('Download started! If on mobile, also use "Send to Telegram" or long-press the poster.');
        if (typeof WebApp !== 'undefined') {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
        setDownloading(false);
      }, 'image/png');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to download image.', 'error');
      setDownloading(false);
    }
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    const url = getTargetQrUrl();
    navigator.clipboard.writeText(url).then(() => {
      showNotification(qrMode === 'pwa' ? 'PWA Install link copied!' : 'Telegram link copied!');
      if (typeof WebApp !== 'undefined') {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
    });
  };

  // Handle Open Link
  const handleOpenLink = () => {
    const url = getTargetQrUrl();
    if (qrMode === 'pwa') {
      window.open(url, '_blank');
    } else {
      if (typeof WebApp !== 'undefined') {
        WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="p-10 text-center font-bold text-slate-600">Access Denied!</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Overlay */}
      {toast && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl font-black text-xs shadow-xl animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-rose-500 text-white border-rose-400'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* 3D White Top Header */}
      <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-[0_2px_0_0_#cbd5e1]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-black flex items-center gap-1.5 text-slate-900">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <QrCode size={15} />
              </div>
              <span>QR Poster Generator</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold">Canva-style High Resolution Marketing Poster</p>
          </div>
        </div>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
            showOptions
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-500 text-slate-950 shadow-[0_2px_0_0_#b45309]'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-[0_2px_0_0_#cbd5e1]'
          }`}
          title="Customize Poster"
        >
          <Sliders size={16} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Customization Drawer */}
        {showOptions && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                <Sliders size={13} />
                Customize Poster Content
              </span>
              <button
                onClick={() => {
                  setQrMode('pwa');
                  if (typeof window !== 'undefined' && window.location.origin) {
                    setPwaInstallUrl(`${window.location.origin}/install`);
                  } else {
                    setPwaInstallUrl('https://choicebingo.com/install');
                  }
                  setBotUsername('choicebingo_bot');
                  setRoomTitle('OFFICIAL CHOICE BINGO');
                  setStartParam('qr');
                  setDevPhone('0904174741');
                  setDevTitle('ለማሰራት');
                  setDevCallToAction('ያናግሩኝ');
                  setDeveloperName('Developer Shikur Ebrahim');
                  setShowDevContact(true);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
              >
                <RefreshCw size={10} /> Reset
              </button>
            </div>

            <div className="space-y-3">
              {/* Destination Selector: PWA App vs Telegram Bot */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>🎯 QR Code Destination</span>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                    qrMode === 'pwa'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-blue-100 text-blue-900 border-blue-300'
                  }`}>
                    {qrMode === 'pwa' ? '⚡ PWA Instant Install' : '✈️ Telegram Bot'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQrMode('pwa')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                      qrMode === 'pwa'
                        ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400 font-black'
                        : 'text-slate-600 hover:text-slate-900 font-bold'
                    }`}
                  >
                    <span>📱 PWA App (Install)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('telegram')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${
                      qrMode === 'telegram'
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-500 font-black'
                        : 'text-slate-600 hover:text-slate-900 font-bold'
                    }`}
                  >
                    <span>✈️ Telegram Bot</span>
                  </button>
                </div>
              </div>

              {qrMode === 'pwa' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    PWA App Install URL
                  </label>
                  <input
                    type="text"
                    value={pwaInstallUrl}
                    onChange={(e) => setPwaInstallUrl(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none shadow-inner transition-all"
                    placeholder="https://choicebingo.com/install"
                  />
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                    ✓ Scanning will open Choice Bingo with the 1-click Install App popup!
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Bot Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                      <input
                        type="text"
                        value={botUsername.replace(/^@/, '')}
                        onChange={(e) => setBotUsername(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-slate-900 outline-none shadow-inner transition-all"
                        placeholder="choicebingo_bot"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Start Parameter (Optional Tracking/Agent Tag)
                    </label>
                    <input
                      type="text"
                      value={startParam}
                      onChange={(e) => setStartParam(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none shadow-inner transition-all"
                      placeholder="qr"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Scans will start: {getFullTelegramUrl()}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Header Subtitle</label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none shadow-inner transition-all"
                  placeholder={qrMode === 'pwa' ? 'OFFICIAL CHOICE BINGO • PWA APP' : 'OFFICIAL CHOICE BINGO'}
                />
              </div>

              {/* Developer Contact Section Settings */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                    <span>✨ Developer Contact Badge</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDevContact}
                      onChange={(e) => setShowDevContact(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                {showDevContact && (
                  <div className="space-y-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Phone Number</label>
                      <input
                        type="text"
                        value={devPhone}
                        onChange={(e) => setDevPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
                        placeholder="0904174741"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Title Text</label>
                        <input
                          type="text"
                          value={devTitle}
                          onChange={(e) => setDevTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
                          placeholder="ለማሰራት"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Call-to-Action</label>
                        <input
                          type="text"
                          value={devCallToAction}
                          onChange={(e) => setDevCallToAction(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
                          placeholder="ያናግሩኝ"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-600 uppercase mb-0.5">Developer Signature (English)</label>
                      <input
                        type="text"
                        value={developerName}
                        onChange={(e) => setDeveloperName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none"
                        placeholder="Developer Shikur Ebrahim"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Poster Preview in 3D Card */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.1)] border-4 border-amber-400/50 bg-amber-50/40">
            {/* Real Image tag so mobile users can long-press to save directly to gallery */}
            {posterUrl ? (
              <img
                src={posterUrl}
                alt="CHOICE BINGO QR Poster"
                className="w-full h-auto block select-none pointer-events-auto"
                style={{ aspectRatio: '2/3' }}
              />
            ) : null}

            {/* Hidden canvas for drawing and high-res export */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200 shadow-xs">
            <ImageIcon size={13} className="text-amber-600" />
            <span>Mobile Tip: Tap &amp; hold the poster to Save to Gallery!</span>
          </div>
        </div>

        {/* 3D Action Buttons */}
        <div className="max-w-sm mx-auto space-y-2.5 pt-1 w-full">
          {/* Method 1: Send Photo Directly to Telegram Chat (Guaranteed 1-Tap Save to Gallery) */}
          <button
            onClick={handleSendToTelegram}
            disabled={sendingTg}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm rounded-xl shadow-[0_4px_0_0_#065f46] active:translate-y-1 active:shadow-none flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {sendingTg ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span>{sendingTg ? 'Sending to Telegram...' : '📲 Send to My Telegram (Save to Gallery)'}</span>
          </button>

          {/* Method 2: Direct File Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_4px_0_0_#b45309] active:translate-y-1 active:shadow-none flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <Download size={17} />
            <span>{downloading ? 'Preparing PNG...' : '📥 Download Poster (PNG)'}</span>
          </button>

          {/* Active Target Capsule */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-bold flex items-center gap-1.5 text-[11px]">
              <QrCode size={13} className="text-amber-600" />
              <span>Target:</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[220px]">
              {getTargetQrUrl()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-[0_2px_0_0_#cbd5e1] active:translate-y-0.5 active:shadow-none flex items-center justify-center space-x-1.5 transition-all"
            >
              <Copy size={14} />
              <span>{qrMode === 'pwa' ? 'Copy Install Link' : 'Copy Bot Link'}</span>
            </button>

            <button
              onClick={handleOpenLink}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-[0_2px_0_0_#cbd5e1] active:translate-y-0.5 active:shadow-none flex items-center justify-center space-x-1.5 transition-all"
            >
              <ExternalLink size={14} />
              <span>{qrMode === 'pwa' ? 'Test Install Page' : 'Test Bot Link'}</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="max-w-sm mx-auto bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start space-x-2.5">
          <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            This QR poster is generated in <strong className="text-slate-900">Ultra-HD print resolution (1200 &times; 1800)</strong>.
            Click <strong className="text-emerald-600">"Send to My Telegram"</strong> to receive the high-res photo directly in your chat with @choicebingo_bot, then tap <strong>Save to Gallery</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
