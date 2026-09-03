import jsQR from 'jsqr';

export interface ParsedTwoFactor {
  issuer: string;
  account: string;
  secret: string;
}

/**
 * Decode QR code data from a Canvas element
 */
export function decodeQRFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return code ? code.data : null;
  } catch (err) {
    console.error('decodeQRFromCanvas error:', err);
    return null;
  }
}

/**
 * Decode QR code from an image file (e.g. from photo album, camera upload, or screenshot)
 */
export async function decodeQRFromImageFile(file: File | Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const maxDim = 1200;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qr && qr.data) {
            resolve(qr.data);
            return;
          }

          if (w !== img.width || h !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const rawData = ctx.getImageData(0, 0, img.width, img.height);
            const rawQr = jsQR(rawData.data, rawData.width, rawData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (rawQr && rawQr.data) {
              resolve(rawQr.data);
              return;
            }
          }

          resolve(null);
        } catch (err) {
          console.error('Error decoding image QR:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Parse standard 2FA OTPAuth URI or raw secret string
 * e.g. otpauth://totp/GitHub:monalisa?secret=JBSWY3DPEHPK3PXP&issuer=GitHub
 */
export function parseTwoFactorQR(text: string): ParsedTwoFactor | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Case 1: Standard otpauth://totp/...
  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (pathname.toLowerCase().startsWith('totp/')) {
        pathname = pathname.substring(5);
      }

      let issuer = url.searchParams.get('issuer') || '';
      let account = pathname;

      if (pathname.includes(':')) {
        const parts = pathname.split(':');
        issuer = issuer || parts[0].trim();
        account = parts.slice(1).join(':').trim();
      }

      const secret = url.searchParams.get('secret') || '';
      if (!secret) return null;

      const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();

      return {
        issuer: issuer || '2FA',
        account: account || '默认账号',
        secret: cleanSecret,
      };
    } catch {
      const secretMatch = trimmed.match(/[?&]secret=([A-Z2-7=]+)/i);
      const issuerMatch = trimmed.match(/[?&]issuer=([^&]+)/i);
      if (secretMatch && secretMatch[1]) {
        return {
          issuer: issuerMatch ? decodeURIComponent(issuerMatch[1]) : '2FA',
          account: '默认账号',
          secret: secretMatch[1].replace(/\s+/g, '').toUpperCase(),
        };
      }
      return null;
    }
  }

  // Case 2: Plain Base32 Secret Key (16 to 64 chars in base32 alphabet: A-Z and 2-7)
  const clean = trimmed.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z2-7=]{16,64}$/.test(clean)) {
    return {
      issuer: '自定义 2FA',
      account: '默认账号',
      secret: clean,
    };
  }

  return null;
}
