import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Upload a file directly through the API server to Cloudflare R2.
 * This completely avoids browser CORS PUT issues with Cloudflare R2 presigned URLs.
 */
export async function uploadImageWithKey(file: File): Promise<UploadResult> {
  const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';

  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // Attempt direct upload through backend first
  try {
    const directRes = await fetch(`${API_URL}/upload/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': initData,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'image/png',
        base64,
      }),
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.publicUrl) {
        return { publicUrl: data.publicUrl, key: data.key || '' };
      }
    }
  } catch (directErr) {
    console.warn('Direct upload failed, attempting presigned fallback:', directErr);
  }

  // Fallback to presigned URL if direct endpoint wasn't reached
  const presignRes = await fetch(`${API_URL}/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'image/png',
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get upload authorization');
  }

  const { uploadUrl, publicUrl, key } = await presignRes.json();

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/png' },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload rejected by storage provider');
  }

  return { publicUrl, key };
}

export async function uploadImage(file: File): Promise<string> {
  const res = await uploadImageWithKey(file);
  return res.publicUrl;
}
