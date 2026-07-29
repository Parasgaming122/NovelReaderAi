/**
 * Bypass Settings — per-plugin bypass method preferences
 * ======================================================
 * Stores which bypass methods each novel source plugin should try and in what order.
 * Uses an in-memory Map that can be seeded/overridden via API calls.
 *
 * Future: could persist to a JSON file or database for persistence across restarts.
 */

import { BypassMethod } from './plugins/types';

// ---------------------------------------------------------------------------
// Default per-plugin bypass method orderings
// ---------------------------------------------------------------------------

const pluginBypassDefaults: Map<string, BypassMethod[]> = new Map([
  // Plugins with no CF protection — smartFetch is sufficient
  ['ixdzs8', ['smartFetch']],
  ['xbiquge', ['smartFetch']],
  ['biquge5200', ['smartFetch']],
  ['biqugecompany', ['smartFetch']],
  ['fanqie', ['smartFetch']],
  ['haodoo', ['smartFetch']],
  ['shw5', ['smartFetch']],
  ['snapd', ['smartFetch']],
  ['trxs', ['smartFetch']],
  ['ttkan', ['smartFetch']],
  ['wanben', ['smartFetch']],
  ['zongheng', ['smartFetch']],
  ['rayforboe', ['smartFetch']],

  // Plugins with heavy CF protection — need heavier bypass methods first
  ['novel543', ['scraper', 'browser', 'impit', 'smartFetch']],
  ['timotxt', ['browser', 'scraper', 'impit', 'smartFetch']],

  // GBK-encoded sites — smartFetch handles GBK natively, impit as fallback
  ['ddxss', ['smartFetch', 'impit']],
  ['piaotia', ['smartFetch', 'impit']],
  ['powanjuan', ['smartFetch', 'impit']],
  ['quanben5', ['smartFetch', 'impit']],
  ['shuhaige', ['smartFetch', 'impit']],

  // Known blocked / heavily protected sites
  ['shuba69', ['browser', 'scraper', 'smartFetch']],
  ['soxs', ['smartFetch', 'impit']],
  ['twkan', ['browser', 'scraper', 'smartFetch']],
  ['qimao', ['smartFetch', 'impit']],
]);

// Global default when a sourceId has no entry
const GLOBAL_DEFAULT_METHODS: BypassMethod[] = ['smartFetch', 'impit'];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the ordered list of bypass methods for a given plugin source.
 * Falls back to the global default ['smartFetch', 'impit'] if unknown.
 */
export function getPluginBypassMethods(sourceId: string): BypassMethod[] {
  return pluginBypassDefaults.get(sourceId) || GLOBAL_DEFAULT_METHODS;
}

/**
 * Override the bypass methods for a given plugin source.
 * Accepts the full ordered array — caller is responsible for validity.
 */
export function setPluginBypassMethods(sourceId: string, methods: BypassMethod[]): void {
  if (!methods || methods.length === 0) {
    // Remove override — fall back to global default
    pluginBypassDefaults.delete(sourceId);
  } else {
    pluginBypassDefaults.set(sourceId, methods);
  }
}

/**
 * Bulk-set bypass methods from a settings object (e.g. from API / UI).
 */
export function setAllPluginBypassMethods(settings: Record<string, BypassMethod[]>): void {
  for (const [sourceId, methods] of Object.entries(settings)) {
    if (Array.isArray(methods) && methods.length > 0) {
      pluginBypassDefaults.set(sourceId, methods);
    }
  }
}

/**
 * Get a snapshot of all plugin bypass defaults (shallow copy).
 * Useful for sending to the frontend settings UI.
 */
export function getAllPluginBypassDefaults(): Record<string, BypassMethod[]> {
  const result: Record<string, BypassMethod[]> = {};
  for (const [k, v] of pluginBypassDefaults) {
    result[k] = [...v];
  }
  return result;
}

/**
 * Reset a specific plugin's bypass methods to the hard-coded defaults.
 * Returns the restored defaults (or null if the sourceId has no built-in default).
 */
export function resetPluginBypassMethods(sourceId: string): BypassMethod[] | null {
  // The hard-coded defaults are set once at module init, so a reset is a
  // "delete override".  If the sourceId never had a built-in default, return null.
  const current = pluginBypassDefaults.get(sourceId);
  if (current) {
    pluginBypassDefaults.delete(sourceId);
    return current;
  }
  return null;
}
