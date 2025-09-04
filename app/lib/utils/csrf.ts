import { cookies } from 'next/headers';
import crypto from 'crypto';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Generates a CSRF token
 * This should be used in server actions only
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets a CSRF token cookie
 * Must be called from a Server Action
 */
export function setCsrfCookie(token: string): void {
  cookies().set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
}

/**
 * Gets the current CSRF token from cookies
 */
export function getCsrfCookie(): string | undefined {
  const cookie: RequestCookie | undefined = cookies().get('csrf_token');
  return cookie?.value;
}

/**
 * Validates a CSRF token against the stored token in cookies
 * 
 * @param token The token to validate
 * @returns True if the token is valid, false otherwise
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfCookie();
  
  if (!storedToken || !token) {
    return false;
  }
  
  try {
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token), 
      Buffer.from(storedToken)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Middleware to validate CSRF tokens for form submissions
 */
export function csrfProtection(formData: FormData): boolean {
  const token = formData.get('csrf_token') as string;
  return validateCsrfToken(token);
}
