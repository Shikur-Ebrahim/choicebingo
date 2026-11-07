import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  telegramUser?: { id: number | string; first_name: string; last_name?: string; username?: string; };
  isPwaUser?: boolean;
}

export function validateTelegramAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const initData = req.headers['x-telegram-init-data'] as string;
  const pwaPhoneHeader = (req.headers['x-pwa-phone'] as string || '').trim();

  // 1. PWA Phone Number Authentication (Direct Web / PWA mode)
  const candidatePhone = pwaPhoneHeader || (initData && initData.startsWith('pwa_phone=') ? decodeURIComponent(initData.replace('pwa_phone=', '')) : '');
  if (candidatePhone) {
    let cleanPhone = candidatePhone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('251')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.length >= 9) {
      req.isPwaUser = true;
      req.telegramUser = {
        id: cleanPhone,
        first_name: cleanPhone,
        username: cleanPhone,
      };
      return next();
    }
  }

  // 2. Telegram WebApp Authentication
  if (!initData) { res.status(401).json({ error: 'No auth data' }); return; }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const dataCheckString = Array.from(params.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN!).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (expectedHash !== hash) { res.status(401).json({ error: 'Invalid auth' }); return; }
    const userData = params.get('user');
    if (userData) req.telegramUser = JSON.parse(decodeURIComponent(userData));
    next();
  } catch { res.status(401).json({ error: 'Auth failed' }); }
}

export function optionalTelegramAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const initData = req.headers['x-telegram-init-data'] as string;
  const pwaPhoneHeader = (req.headers['x-pwa-phone'] as string || '').trim();

  // 1. PWA Phone Number Authentication (Direct Web / PWA mode)
  const candidatePhone = pwaPhoneHeader || (initData && initData.startsWith('pwa_phone=') ? decodeURIComponent(initData.replace('pwa_phone=', '')) : '');
  if (candidatePhone) {
    let cleanPhone = candidatePhone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('251')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.length >= 9) {
      req.isPwaUser = true;
      req.telegramUser = {
        id: cleanPhone,
        first_name: cleanPhone,
        username: cleanPhone,
      };
      return next();
    }
  }

  // 2. Telegram WebApp Authentication
  if (initData) {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');
      const dataCheckString = Array.from(params.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN!).digest();
      const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
      if (expectedHash === hash) {
        const userData = params.get('user');
        if (userData) req.telegramUser = JSON.parse(decodeURIComponent(userData));
      }
    } catch {
      // Continue without user
    }
  }

  next();
}
