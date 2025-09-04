'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Generates a CSRF token and sets it in a cookie
 * Server Action to handle cookie operations
 */
export async function generateAndSetCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  
  cookies().set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
  
  return token;
}

/**
 * Gets the current CSRF token
 * Server Action to retrieve cookie
 */
export async function getCsrfToken(): Promise<string | undefined> {
  return cookies().get('csrf_token')?.value;
}

/**
 * Validates a CSRF token
 * Server Action for validation
 */
export async function validateToken(token: string): Promise<boolean> {
  const storedToken = await getCsrfToken();
  
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
