/**
 * Handle validation utilities
 * Rules based on Twitter/X: 4-15 chars, alphanumeric + underscore only, case-insensitive
 */

// Reserved handles that cannot be claimed
const RESERVED_HANDLES = new Set([
    'admin',
    'api',
    'settings',
    'help',
    'support',
    'globalphone',
    'call',
    'calls',
    'user',
    'users',
    'profile',
    'home',
    'about',
    'login',
    'logout',
    'signup',
    'register',
    'auth',
    'account',
    'dashboard',
    'terms',
    'privacy',
    'contact',
]);

// Validation regex: 4-15 chars, letters, numbers, underscores only
const HANDLE_REGEX = /^[a-zA-Z0-9_]{4,15}$/;

export interface HandleValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate a handle format (does not check availability)
 */
export function validateHandle(handle: string): HandleValidationResult {
    if (!handle) {
        return { valid: false, error: 'Handle is required' };
    }

    const normalized = handle.toLowerCase().trim();

    if (normalized.length < 4) {
        return { valid: false, error: 'Handle must be at least 4 characters' };
    }

    if (normalized.length > 15) {
        return { valid: false, error: 'Handle must be at most 15 characters' };
    }

    if (!HANDLE_REGEX.test(normalized)) {
        return { valid: false, error: 'Handle can only contain letters, numbers, and underscores' };
    }

    if (RESERVED_HANDLES.has(normalized)) {
        return { valid: false, error: 'This handle is reserved' };
    }

    return { valid: true };
}

/**
 * Normalize a handle for storage (lowercase, trimmed)
 */
export function normalizeHandle(handle: string): string {
    return handle.toLowerCase().trim();
}

/**
 * Check if a string looks like an Ethereum address
 */
export function isEthereumAddress(identifier: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(identifier);
}
