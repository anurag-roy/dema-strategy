import { createHash } from 'crypto';

/**
 * Get the sha256 hash of a string
 * @param input String to be hashed
 * @returns the hashed string
 */
export const getHash = (input: string) =>
  createHash('sha256').update(input).digest('hex');
