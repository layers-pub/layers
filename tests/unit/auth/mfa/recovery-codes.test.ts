/**
 * Unit tests for MFA recovery code generation and verification.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  DEFAULT_RECOVERY_CODE_COUNT,
  RECOVERY_CODE_LENGTH,
} from '../../../../src/auth/mfa/recovery-codes.js';

describe('generateRecoveryCodes', () => {
  it('generates the default number of codes (10)', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(DEFAULT_RECOVERY_CODE_COUNT);
    expect(codes).toHaveLength(10);
  });

  it('generates the specified number of codes', () => {
    const codes = generateRecoveryCodes(5);
    expect(codes).toHaveLength(5);
  });

  it('generates codes of the correct length', () => {
    const codes = generateRecoveryCodes();
    for (const code of codes) {
      expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
      expect(code).toHaveLength(8);
    }
  });

  it('generates unique codes', () => {
    const codes = generateRecoveryCodes(100);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(100);
  });

  it('generates codes with only alphanumeric characters', () => {
    const codes = generateRecoveryCodes(50);
    const validChars = /^[a-z2-9]+$/;
    for (const code of codes) {
      expect(code).toMatch(validChars);
    }
  });

  it('generates zero codes when count is 0', () => {
    const codes = generateRecoveryCodes(0);
    expect(codes).toHaveLength(0);
  });
});

describe('hashRecoveryCode', () => {
  it('returns a hex string', () => {
    const hash = hashRecoveryCode('testcode');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent hashes for the same input', () => {
    const hash1 = hashRecoveryCode('abcd1234');
    const hash2 = hashRecoveryCode('abcd1234');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashRecoveryCode('code1111');
    const hash2 = hashRecoveryCode('code2222');
    expect(hash1).not.toBe(hash2);
  });

  it('is case-insensitive', () => {
    const hash1 = hashRecoveryCode('ABCD1234');
    const hash2 = hashRecoveryCode('abcd1234');
    expect(hash1).toBe(hash2);
  });
});

describe('verifyRecoveryCode', () => {
  it('returns the index of a matching code', () => {
    const codes = generateRecoveryCodes(5);
    const hashes = codes.map((code) => hashRecoveryCode(code));

    // Verify the third code (index 2)
    const targetCode = codes[2];
    expect(targetCode).toBeDefined();
    const index = verifyRecoveryCode(targetCode!, hashes);
    expect(index).toBe(2);
  });

  it('returns -1 for a non-matching code', () => {
    const codes = generateRecoveryCodes(5);
    const hashes = codes.map((code) => hashRecoveryCode(code));

    const index = verifyRecoveryCode('zzzzzzzz', hashes);
    expect(index).toBe(-1);
  });

  it('is case-insensitive when verifying', () => {
    const code = 'abcd5678';
    const hash = hashRecoveryCode(code);

    const index = verifyRecoveryCode('ABCD5678', [hash]);
    expect(index).toBe(0);
  });

  it('returns -1 for an empty hash array', () => {
    const index = verifyRecoveryCode('testcode', []);
    expect(index).toBe(-1);
  });

  it('returns the first matching index when duplicates exist', () => {
    const code = 'testcode';
    const hash = hashRecoveryCode(code);
    const hashes = ['other-hash', hash, hash];

    const index = verifyRecoveryCode(code, hashes);
    expect(index).toBe(1);
  });
});
