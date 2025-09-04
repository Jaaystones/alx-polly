/**
 * Sanitizes user input to prevent XSS attacks
 * 
 * @param input The user input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Replace HTML special characters with their entity equivalents
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes an email address
 * 
 * @param email The email to validate
 * @returns Valid sanitized email or empty string
 */
export function validateEmail(email: string): string {
  if (!email) return '';
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }
  
  return sanitizeInput(email);
}

/**
 * Rate limiter utility function
 * In a real app, this would use Redis or another persistence layer
 */
const rateLimits: Record<string, { count: number, resetTime: number }> = {};

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  const now = Date.now();
  
  // Clear expired entries
  if (!rateLimits[key] || rateLimits[key].resetTime < now) {
    rateLimits[key] = { count: 0, resetTime: now + windowMs };
  }
  
  // Increment counter
  rateLimits[key].count++;
  
  // Check if limit exceeded
  return rateLimits[key].count <= maxAttempts;
}
