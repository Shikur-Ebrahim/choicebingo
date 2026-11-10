import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Converts a selected image File into an optimized Data URI with high resolution.
 * - Defaults to maxSize: 1920 (ensures full HD crisp text on receipts)
 * - Fills canvas with white background so transparent PNGs/receipts never turn black
 * - High-quality canvas smoothing for razor-sharp characters and numbers
 */
export async function fileToDataUrl(
  file: File,
  maxSize = 1920,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          resolve('');
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            // If image is already smaller than maxSize, maintain original crisp dimensions
            if (width > height) {
              if (width > maxSize) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // White background to prevent transparent regions from turning black in JPEG
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);

              // Use high-quality JPEG for crystal clear receipt text and lightweight size
              const compressed = canvas.toDataURL('image/jpeg', quality);
              resolve(compressed || result);
            } else {
              resolve(result);
            }
          } catch {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch {
      resolve('');
    }
  });
}

/**
 * Upload high-resolution screenshot for payment verification (receipts).
 * - High-res 1920px canvas conversion (razor-sharp text for CBE, Telebirr, BoA receipts)
 * - Attempts direct upload to Cloudflare R2 for fast CDN delivery
 * - Seamlessly falls back to high-res Data URI with 0 dependencies
 */
export async function uploadScreenshot(file: File): Promise<string> {
  // 1. Generate crystal-clear high-res 1920px Data URI first
  const highResDataUrl = await fileToDataUrl(file, 1920, 0.92);
  const fallbackUrl =
    highResDataUrl ||
    (await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string) || '');
      r.onerror = () => resolve('');
      r.readAsDataURL(file);
    }));

  // 2. Attempt fast direct upload to Cloudflare R2
  try {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(`${API_URL}/upload/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': initData,
        'x-pwa-phone': pwaPhone,
      },
      body: JSON.stringify({
        filename: file.name || 'receipt.jpg',
        contentType: 'image/jpeg',
        base64: fallbackUrl,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('[uploadScreenshot] R2 direct upload skipped/failed, using high-res data URI:', err);
  }

  // 3. Fallback to crystal-clear high-res data URL
  return fallbackUrl;
}

/**
 * Upload image for method logos and icons (default 512px).
 */
export async function uploadImage(file: File, maxSize = 512): Promise<string> {
  const dataUrl = await fileToDataUrl(file, maxSize, 0.92);
  if (dataUrl) return dataUrl;

  return new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string) || '');
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}
