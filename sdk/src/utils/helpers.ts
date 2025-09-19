import type { SDKConfig } from '../types';

/**
 * Utility functions for the TokenLaunch SDK
 */

/**
 * Validate SDK configuration
 */
export function validateConfig(config: SDKConfig): void {
  // Validate Eliza config
  if (!config.eliza.modelProvider) {
    throw new Error('Eliza model provider is required');
  }

  if (config.eliza.temperature < 0 || config.eliza.temperature > 1) {
    throw new Error('Eliza temperature must be between 0 and 1');
  }

  // Validate Solana config
  if (!config.solana.programId) {
    throw new Error('Solana program ID is required');
  }

  if (!['devnet', 'mainnet-beta', 'testnet'].includes(config.solana.cluster)) {
    throw new Error('Invalid Solana cluster');
  }

  // Validate Twitter config
  if (!config.twitter.username || !config.twitter.password) {
    throw new Error('Twitter credentials are required');
  }

  if (config.twitter.maxRepliesPerHour < 1 || config.twitter.maxRepliesPerHour > 100) {
    throw new Error('Max replies per hour must be between 1 and 100');
  }

  // Validate meme coin config
  if (config.memeCoin.minSentimentScore < 0 || config.memeCoin.minSentimentScore > 1) {
    throw new Error('Min sentiment score must be between 0 and 1');
  }

  if (config.memeCoin.maxSupply < 1000000 || config.memeCoin.maxSupply > 1000000000000) {
    throw new Error('Max supply must be between 1M and 1T');
  }
}

/**
 * Format token name for blockchain compatibility
 */
export function formatTokenName(name: string): string {
  return name
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 32); // Limit length
}

/**
 * Sanitize content to remove harmful or inappropriate text
 */
export function sanitizeContent(content: string): string {
  // Remove or replace potentially harmful content
  const bannedWords = ['scam', 'rug', 'hack', 'steal', 'fraud'];
  let sanitized = content;

  bannedWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, '[REMOVED]');
  });

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Remove very long words (potential spam)
  sanitized = sanitized.replace(/\w{50,}/g, '[LONG_WORD]');

  return sanitized.substring(0, 500); // Limit total length
}

/**
 * Generate a random string for IDs
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Convert timestamp to human readable format
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Format numbers for display
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format SOL amounts
 */
export function formatSOL(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1) {
    return sol.toFixed(2) + ' SOL';
  }
  if (sol >= 0.001) {
    return (sol * 1000).toFixed(2) + ' mSOL';
  }
  return (sol * 1000000).toFixed(0) + ' μSOL';
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Basic length and character validation
    if (address.length < 32 || address.length > 44) {
      return false;
    }
    
    // Check for valid base58 characters
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    return base58Regex.test(address);
  } catch {
    return false;
  }
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(array: T[], keyFn?: (item: T) => any): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Deep merge objects
 */
export function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Truncate string with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Generate token symbol from text
 */
export function generateTokenSymbol(text: string): string {
  // Extract meaningful words
  const words = text
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (words.length === 0) {
    return 'MEME' + Math.floor(Math.random() * 100);
  }

  // Try to create symbol from first letters
  let symbol = words.map(word => word[0]).join('');
  
  // If too long, take first word and truncate
  if (symbol.length > 6) {
    symbol = words[0].substring(0, 6);
  }

  // If too short, pad with meaningful letters
  if (symbol.length < 3) {
    const firstWord = words[0] || 'MEME';
    symbol = firstWord.substring(0, Math.min(6, Math.max(3, firstWord.length)));
  }

  return symbol;
}