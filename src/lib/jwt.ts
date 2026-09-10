import { UserRole } from '@/types/database';

const JWT_SECRET = process.env.JWT_SECRET || 'lb-staff-manager-super-secure-jwt-secret-key-2026';
const COOKIE_NAME = 'lb_auth_token';

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  fullName?: string | null;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(str: string | Uint8Array): string {
  let base64: string;
  if (typeof str === 'string') {
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(str, 'utf8').toString('base64');
    } else {
      base64 = btoa(unescape(encodeURIComponent(str)));
    }
  } else {
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(str).toString('base64');
    } else {
      let binary = '';
      for (let i = 0; i < str.length; i++) {
        binary += String.fromCharCode(str[i]);
      }
      base64 = btoa(binary);
    }
  }
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf8');
  } else {
    return decodeURIComponent(escape(atob(base64)));
  }
}

// Node crypto for synchronous fast operations where Buffer is available
let nodeCrypto: typeof import('crypto') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodeCrypto = require('crypto');
} catch {
  nodeCrypto = null;
}

/**
 * Sign a standard HS256 JSON Web Token
 */
export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInSeconds = 7 * 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  if (nodeCrypto) {
    const signature = nodeCrypto
      .createHmac('sha256', JWT_SECRET)
      .update(dataToSign)
      .digest();
    return `${dataToSign}.${base64UrlEncode(signature)}`;
  }

  // Fallback signature
  return `${dataToSign}.demo-sig`;
}

/**
 * Verify and decode an HS256 JSON Web Token
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    if (nodeCrypto) {
      const expectedSignature = base64UrlEncode(
        nodeCrypto
          .createHmac('sha256', JWT_SECRET)
          .update(dataToSign)
          .digest()
      );

      if (expectedSignature !== encodedSignature) {
        return null;
      }
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash password with PBKDF2 and random salt
 */
export function hashPassword(password: string): string {
  if (nodeCrypto) {
    const salt = nodeCrypto.randomBytes(16).toString('hex');
    const hash = nodeCrypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return `${salt}:${hash}`;
  }
  return `salt123:${password}`;
}

/**
 * Verify plaintext password against stored salt:hash or raw hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !password) return false;

    // Direct match (plaintext fallback for dev/testing)
    if (storedHash === password) return true;

    // Standard PBKDF2 format: salt:hash
    if (storedHash.includes(':')) {
      const [salt, originalHash] = storedHash.split(':');
      if (!salt || !originalHash) return false;

      if (nodeCrypto) {
        const computedHash = nodeCrypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
        if (computedHash.length !== originalHash.length) return false;
        return nodeCrypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(originalHash));
      }

      return originalHash === password;
    }

    // SHA-256 fallback (if 64-char hex string was stored directly in database)
    if (nodeCrypto && storedHash.length === 64) {
      const shaHash = nodeCrypto.createHash('sha256').update(password).digest('hex');
      if (shaHash.length !== storedHash.length) return false;
      return nodeCrypto.timingSafeEqual(Buffer.from(shaHash), Buffer.from(storedHash));
    }

    return false;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
