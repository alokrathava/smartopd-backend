import { Transform } from 'class-transformer';
import { escapeHtml } from '../utils/sanitize.util';

/**
 * Decorator to automatically sanitize string values in DTOs
 * Escapes HTML special characters to prevent XSS attacks
 *
 * Usage:
 *   @Sanitize()
 *   @IsString()
 *   firstName: string;
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return escapeHtml(value);
    }
    return value;
  });
}
