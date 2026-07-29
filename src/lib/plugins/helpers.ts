import * as cheerio from 'cheerio';
import { PluginNovelItem } from './types';

/**
 * Validates that a URL looks like a book detail page, not a chapter or homepage link.
 * Used by catalog browsing to filter out non-book links.
 */
export function isBookLink(href: string): boolean {
  if (!href) return false;
  const cleanHref = href.toLowerCase().trim();

  // Exclude navigation/utility links
  if (
    cleanHref.includes('login') ||
    cleanHref.includes('register') ||
    cleanHref.includes('user') ||
    cleanHref.includes('case') ||
    cleanHref.includes('history') ||
    cleanHref.includes('sort') && !cleanHref.includes('/sort/')
  ) {
    return false;
  }

  // Exclude chapter links
  if (/\/\d+\/\d+\.html/i.test(cleanHref)) return false;
  if (/\/\d+_\d+\.html/i.test(cleanHref)) return false;
  if (/\/read\/\d+\/\d+/i.test(cleanHref)) return false;

  // Exclude homepage or static pages
  if (cleanHref === '/' || cleanHref === '' || cleanHref.endsWith('index.html') || cleanHref.endsWith('index.php')) {
    return false;
  }

  // Valid book detail URL patterns
  if (/\/book\/\d+\/?/i.test(cleanHref)) return true;
  if (/\/txt\/\d+/i.test(cleanHref)) return true;
  if (/\/info\/\d+/i.test(cleanHref)) return true;
  if (/\/b\/\d+/i.test(cleanHref)) return true;
  if (/\/d\/\d+/i.test(cleanHref)) return true;
  if (/\/\d{4,}\/?$/.test(cleanHref)) return true;
  if (/\/\d+_\d+\/?$/.test(cleanHref)) return true;
  if (/\/\d+\.htm$/i.test(cleanHref)) return true;

  return false;
}
