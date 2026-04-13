/**
 * HTML sanitization utilities for XSS prevention
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param str Input string that may contain HTML
 * @returns Escaped string safe for HTML context
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '=': '&#x3D;',
  };

  return String(str).replace(/[&<>"'\/=]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Remove HTML tags completely (for text-only fields)
 * @param str Input string that may contain HTML
 * @returns String with HTML tags removed
 */
export function stripHtmlTags(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, '');
}

/**
 * Sanitize an object recursively by escaping string values
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj;

  const sanitized: Record<string, any> = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      // Escape HTML in string fields
      sanitized[key] = escapeHtml(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      // Handle arrays
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? escapeHtml(item) : item,
      );
    }
  }

  return sanitized;
}
