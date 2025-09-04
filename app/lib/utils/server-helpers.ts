import { generateCsrfToken } from "./csrf";
import { generateAndSetCsrfToken } from "../actions/csrf-actions";

/**
 * Generates a CSRF meta tag with a valid token
 * For use in server components
 */
export async function getCsrfMetaTag() {
  // Generate a token without setting a cookie (just for the meta tag)
  const token = generateCsrfToken();
  return { __html: `<meta name="csrf-token" content="${token}" />` };
}
