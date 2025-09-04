# ALX Polly Security Fixes

This document outlines the security vulnerabilities found in the ALX Polly application and the steps taken to address them.

## Overview of Vulnerabilities

The security audit identified the following categories of vulnerabilities:

1. Authentication vulnerabilities
2. Authorization issues
3. Data validation and input handling problems
4. XSS vulnerabilities in sharing functionality
5. Error handling issues
6. Environment configuration security concerns
7. Code-level security problems
8. Middleware security weaknesses

## Fixes Implemented

Below are the specific fixes implemented for each vulnerability:

### 1. Authentication Security Fixes

#### 1.1 Implemented Strong Password Policy

- Added password strength validation in the registration form
- Required passwords to include uppercase, lowercase, numbers, and special characters
- Added visual password strength indicator for user feedback
- Implemented client-side validation to prevent weak passwords

```typescript
const validatePassword = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Check for password complexity
  const isValid =
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar;

  // Display strength indicator
  if (password.length === 0) {
    setPasswordStrength("");
  } else if (isValid) {
    setPasswordStrength("strong");
  } else if (
    password.length >= 6 &&
    (hasUpperCase || hasLowerCase) &&
    hasNumbers
  ) {
    setPasswordStrength("medium");
  } else {
    setPasswordStrength("weak");
  }

  return isValid;
};
```

#### 1.2 Added CSRF Protection

- Created a CSRF protection utility in `/app/lib/utils/csrf.ts`
- Implemented token generation and verification using cryptographically secure methods
- Added CSRF tokens to all forms via a meta tag
- Validated CSRF tokens on all form submissions

```typescript
// Sample from csrf.ts
export function generateCsrfToken(): string {
  const csrfToken = crypto.randomBytes(32).toString("hex");

  // Store the token in a secure cookie
  cookies().set("csrf_token", csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return csrfToken;
}
```

#### 1.3 Removed Sensitive Information Logging

- Removed all console.log statements that exposed user data
- Replaced detailed error logging with generic error messages
- Eliminated exposure of sensitive session information

```typescript
// Before
console.log("AuthContext: Auth state changed", _event, session, session?.user);

// After
// Removed sensitive console logging
```

#### 1.4 Implemented Rate Limiting

- Added rate limiting for login attempts (5 per minute)
- Added rate limiting for registration (3 per hour)
- Implemented rate limiting for poll creation and updates

```typescript
// Rate limiter utility function
const rateLimits: Record<string, { count: number; resetTime: number }> = {};

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60000
): boolean {
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
```

### 2. Authorization Security Fixes

#### 2.1 Enforced Object-Level Authorization

- Updated the `deletePoll` function to verify ownership before deletion
- Fixed the `updatePoll` function to check user permissions
- Added ownership validation in the edit poll page

```typescript
// Before (vulnerable)
export async function deletePoll(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/polls");
  return { error: null };
}

// After (secure)
export async function deletePoll(id: string) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { error: userError.message };
  }

  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // First check if the poll belongs to the user
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("user_id")
    .eq("id", id)
    .single();

  if (pollError) {
    return { error: pollError.message };
  }

  if (!poll) {
    return { error: "Poll not found" };
  }

  if (poll.user_id !== user.id) {
    return { error: "You can only delete your own polls" };
  }

  // Now delete the poll
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/polls");
  return { error: null };
}
```

#### 2.2 Required Authentication for Voting

- Made authentication mandatory for voting
- Added check to prevent multiple votes from the same user
- Improved error messages for unauthorized voting attempts

```typescript
// Before (vulnerable)
// Optionally require login to vote
// if (!user) return { error: 'You must be logged in to vote.' };

// After (secure)
if (!user) return { error: "You must be logged in to vote." };

// Check if user has already voted on this poll
const { data: existingVote, error: checkError } = await supabase
  .from("votes")
  .select("*")
  .eq("poll_id", pollId)
  .eq("user_id", user.id);

if (checkError) return { error: checkError.message };

if (existingVote && existingVote.length > 0) {
  return { error: "You have already voted on this poll" };
}
```

#### 2.3 Secured Poll Editing

- Added authorization check in the poll edit page
- Implemented server-side ownership validation
- Added redirect for unauthorized access attempts

```typescript
// Before (vulnerable)
export default async function EditPollPage({
  params,
}: {
  params: { id: string };
}) {
  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    notFound();
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  );
}

// After (secure)
export default async function EditPollPage({
  params,
}: {
  params: { id: string };
}) {
  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    notFound();
  }

  // Check if the current user is the owner of the poll
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || poll.user_id !== user.id) {
    // Redirect to unauthorized page or polls list
    redirect("/polls");
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <EditPollForm poll={poll} />
    </div>
  );
}
```

### 3. Data Validation & Input Sanitization

#### 3.1 Created Input Sanitization Utilities

- Implemented a new security utility module `/app/lib/utils/security.ts`
- Added functions for input sanitization and validation
- Created email validation function with proper regex

```typescript
export function sanitizeInput(input: string): string {
  if (!input) return "";

  // Replace HTML special characters with their entity equivalents
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function validateEmail(email: string): string {
  if (!email) return "";

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "";
  }

  return sanitizeInput(email);
}
```

#### 3.2 Enhanced Form Processing

- Updated all form processing to sanitize user inputs
- Applied input validation before database operations
- Prevented SQL injection by sanitizing query parameters

```typescript
// Before (vulnerable)
const question = formData.get("question") as string;
const options = formData.getAll("options").filter(Boolean) as string[];

// After (secure)
const question = sanitizeInput(formData.get("question") as string);
const unsanitizedOptions = formData.getAll("options") as string[];
const options = unsanitizedOptions
  .filter(Boolean)
  .map((option) => sanitizeInput(option));
```

### 4. Fixed XSS Vulnerabilities

#### 4.1 Secured the Share Component

- Renamed `VulnerableShare.tsx` to `SecureShare.tsx`
- Sanitized poll titles before including in share links
- Added proper URL encoding for all parameters
- Implemented security headers for window.open calls

```typescript
// Before (vulnerable)
const text = encodeURIComponent(`Check out this poll: ${pollTitle}`);
const url = encodeURIComponent(shareUrl);
window.open(
  `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  "_blank"
);

// After (secure)
const text = encodeURIComponent(`Check out this poll: ${sanitizedTitle}`);
const url = encodeURIComponent(shareUrl);
const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;

// Open in a new window with security precautions
window.open(twitterUrl, "_blank", "noopener,noreferrer");
```

#### 4.2 Protected URL Generation

- Added checks to prevent URL manipulation
- Sanitized all parameters used in URL construction
- Used safe encoding methods for all user-provided content

```typescript
// Before (vulnerable)
const baseUrl = window.location.origin;
const pollUrl = `${baseUrl}/polls/${pollId}`;

// After (secure)
if (typeof window !== "undefined") {
  const baseUrl = window.location.origin;
  const safePollId = encodeURIComponent(pollId);
  const pollUrl = `${baseUrl}/polls/${safePollId}`;
  setShareUrl(pollUrl);
}
```

### 5. Improved Error Handling

#### 5.1 Implemented Generic Error Messages

- Replaced detailed database error messages with generic ones
- Prevented information disclosure through error messages
- Added user-friendly error messages without technical details

```typescript
// Before (vulnerable)
if (error) {
  return { error: error.message };
}

// After (secure)
if (error) {
  // Return a generic error message to prevent user enumeration
  return { error: "Invalid email or password" };
}
```

#### 5.2 Standardized Error States

- Created consistent error handling across components
- Added proper validation feedback for form inputs
- Improved error display for better user experience

### 6. Enhanced Environment Security

#### 6.1 Secured Cookie Handling

- Added secure flags to cookies
- Set HttpOnly flag to prevent JavaScript access
- Implemented SameSite policy for cookies
- Added proper expiration times

```typescript
// Updated cookie settings
supabaseResponse.cookies.set(name, value, {
  ...options,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  httpOnly: true,
});
```

### 7. Fixed Code-Level Security Issues

#### 7.1 Removed Debug Statements

- Eliminated all console.log statements with sensitive data
- Removed debugging information from production code
- Added safer logging practices

#### 7.2 Fixed Direct Object References

- Added proper validation for all IDs used in URLs
- Implemented ownership checks before accessing resources
- Protected against parameter tampering

### 8. Strengthened Middleware Security

#### 8.1 Enhanced Session Management

- Improved the middleware to properly validate sessions
- Added redirect for unauthenticated access to protected routes
- Implemented more granular route protection

```typescript
// Enhanced middleware
if (
  !session &&
  !request.nextUrl.pathname.startsWith("/login") &&
  !request.nextUrl.pathname.startsWith("/register") &&
  !request.nextUrl.pathname.startsWith("/auth") &&
  request.nextUrl.pathname !== "/" // Allow access to homepage without login
) {
  // Create a URL object for the login page
  const url = request.nextUrl.clone();
  url.pathname = "/login";

  // Add the original URL as a query parameter to redirect after login
  url.searchParams.set("redirectTo", request.nextUrl.pathname);

  // Redirect to login
  return NextResponse.redirect(url);
}
```

#### 8.2 Improved Route Protection

- Updated the middleware matcher for better security
- Protected sensitive routes from unauthorized access
- Added explicit public routes for better clarity

```typescript
export const config = {
  matcher: [
    // Exclude files and auth routes, but protect sensitive routes
    "/((?!_next/static|_next/image|favicon.ico|login|register|auth|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## Conclusion

The implemented security fixes address all the identified vulnerabilities in the ALX Polly application. These changes significantly improve the application's security posture by adding multiple layers of protection against common web security threats including XSS, CSRF, authentication bypasses, and authorization issues.

By implementing these changes, we've ensured that:

1. User authentication is robust and secure
2. Access control properly restricts operations to authorized users
3. User inputs are properly validated and sanitized
4. Error handling doesn't leak sensitive information
5. The application is protected against common web vulnerabilities

These improvements align with security best practices and industry standards for web application security.
