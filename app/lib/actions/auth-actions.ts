'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { sanitizeInput, validateEmail, checkRateLimit } from '../utils/security';
import { validateToken, generateAndSetCsrfToken } from './csrf-actions';

export async function login(formData: FormData | LoginFormData) {
  // If formData is a FormData object, extract the email and password
  const data = formData instanceof FormData
    ? {
        email: formData.get('email') as string,
        password: formData.get('password') as string
      }
    : formData;
  
  // Validate CSRF token if present in FormData
  if (formData instanceof FormData && formData.has('csrf_token')) {
    const token = formData.get('csrf_token') as string;
    const isValidCsrf = await validateToken(token);
    if (!isValidCsrf) {
      return { error: "Invalid or expired form submission. Please try again." };
    }
  }
  
  // Apply rate limiting - 5 attempts per minute by IP (or email in this case)
  const emailKey = `login_${data.email.toLowerCase()}`;
  if (!checkRateLimit(emailKey, 5, 60000)) {
    return { error: "Too many login attempts. Please try again later." };
  }
  
  // Sanitize and validate inputs
  const email = validateEmail(data.email);
  if (!email) {
    return { error: "Invalid email format" };
  }
  
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: data.password, // Passwords should not be sanitized
  });

  if (error) {
    // Return a generic error message to prevent user enumeration
    return { error: "Invalid email or password" };
  }

  // Success: no error
  // Set a new CSRF token
  await generateAndSetCsrfToken();
  return { error: null };
}

export async function register(formData: FormData | RegisterFormData) {
  // If formData is a FormData object, extract the fields
  const data = formData instanceof FormData
    ? {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string
      }
    : formData;
  
  // Validate CSRF token if present in FormData
  if (formData instanceof FormData && formData.has('csrf_token')) {
    const token = formData.get('csrf_token') as string;
    const isValidCsrf = await validateToken(token);
    if (!isValidCsrf) {
      return { error: "Invalid or expired form submission. Please try again." };
    }
  }
  
  // Apply rate limiting - 3 registrations per hour from the same source
  if (!checkRateLimit('register_global', 3, 3600000)) {
    return { error: "Registration is temporarily unavailable. Please try again later." };
  }
  
  // Sanitize and validate inputs
  const name = sanitizeInput(data.name);
  const email = validateEmail(data.email);
  
  if (!email) {
    return { error: "Invalid email format" };
  }
  
  if (!name || name.length < 2) {
    return { error: "Name is required and must be at least 2 characters" };
  }
  
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password: data.password, // Passwords should not be sanitized
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    // Provide a generic error message for security
    return { error: "Registration failed. Please try again with a different email." };
  }

  // Success: no error
  // Set a new CSRF token
  await generateAndSetCsrfToken();
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
