/**
 * MFA recovery code generation, hashing, and verification.
 *
 * Recovery codes are one-time backup codes that allow users to regain
 * access when their primary MFA device is unavailable. Each code is
 * an 8-character alphanumeric string, hashed with SHA-256 for storage.
 *
 * @module
 */

import { createHash, randomBytes } from 'node:crypto';

/** Default number of recovery codes to generate. */
const DEFAULT_RECOVERY_CODE_COUNT = 10;

/** Length of each recovery code in characters. */
const RECOVERY_CODE_LENGTH = 8;

/** Alphanumeric character set for code generation (no ambiguous chars). */
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generates a set of one-time recovery codes.
 *
 * Each code is an 8-character alphanumeric string drawn from an
 * unambiguous character set (excludes 0, 1, i, l, o to reduce
 * transcription errors).
 *
 * @param count - number of codes to generate (defaults to 10)
 * @returns an array of plaintext recovery codes
 */
function generateRecoveryCodes(count: number = DEFAULT_RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(RECOVERY_CODE_LENGTH);
    let code = '';
    for (let j = 0; j < RECOVERY_CODE_LENGTH; j++) {
      const byte = bytes[j];
      if (byte === undefined) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Hashes a recovery code using SHA-256.
 *
 * Codes are lowercased before hashing to ensure case-insensitive
 * verification.
 *
 * @param code - the plaintext recovery code
 * @returns the hex-encoded SHA-256 hash
 */
function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.toLowerCase()).digest('hex');
}

/**
 * Verifies a recovery code against an array of stored hashes.
 *
 * Returns the index of the matching hash so the caller can mark
 * that code as used. Returns -1 if no match is found.
 *
 * @param code - the plaintext recovery code to verify
 * @param hashedCodes - array of SHA-256 hashed codes
 * @returns the index of the matched code, or -1 if not found
 */
function verifyRecoveryCode(code: string, hashedCodes: string[]): number {
  const inputHash = hashRecoveryCode(code);

  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] === inputHash) {
      return i;
    }
  }

  return -1;
}

export {
  DEFAULT_RECOVERY_CODE_COUNT,
  generateRecoveryCodes,
  hashRecoveryCode,
  RECOVERY_CODE_LENGTH,
  verifyRecoveryCode,
};
