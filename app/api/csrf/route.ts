import { NextRequest, NextResponse } from 'next/server';
import { generateAndSetCsrfToken } from '@/app/lib/actions/csrf-actions';

// This route handler sets a CSRF cookie and returns the token
// It can be called before submitting forms
export async function GET(request: NextRequest) {
  const token = await generateAndSetCsrfToken();
  return NextResponse.json({ token });
}
