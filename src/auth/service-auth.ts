/**
 * Service-to-service authentication using signed JWTs with Ed25519 keys.
 *
 * Provides asymmetric key pair generation, token creation, and token
 * verification for zero-trust communication between Layers services
 * (e.g., indexer to API server).
 *
 * @module
 */

import { randomUUID } from 'node:crypto';

import * as jose from 'jose';

import { type Result, Err, Ok } from '../types/result.js';
import { TokenValidationError } from './errors.js';

/**
 * Configuration for the service auth manager.
 */
export interface ServiceAuthConfig {
  /** Unique identifier for this service (e.g., "layers-api" or "layers-indexer"). */
  readonly serviceId: string;
  /** This service's Ed25519 private key in JWK format. */
  readonly privateKey: jose.JWK;
  /** Map of trusted service IDs to their Ed25519 public keys in JWK format. */
  readonly trustedServices: ReadonlyMap<string, jose.JWK>;
  /** Token time-to-live in milliseconds (defaults to 60 seconds). */
  readonly tokenTtlMs?: number | undefined;
}

/**
 * Claims contained in a verified service token.
 */
export interface ServiceTokenPayload {
  /** Issuer: the service ID that created the token. */
  readonly iss: string;
  /** Audience: the target service ID this token was created for. */
  readonly aud: string;
  /** Unique token identifier for replay detection. */
  readonly jti: string;
  /** Issued-at timestamp (seconds since epoch). */
  readonly iat: number;
  /** Expiration timestamp (seconds since epoch). */
  readonly exp: number;
}

/** Default service token TTL: 60 seconds. */
const DEFAULT_SERVICE_TOKEN_TTL_MS = 60_000;

/**
 * Manages service-to-service JWT creation and verification.
 *
 * Tokens are signed with EdDSA (Ed25519) for strong asymmetric authentication.
 * Each service holds its own private key and a map of trusted peer public keys.
 */
export class ServiceAuthManager {
  private readonly serviceId: string;
  private readonly privateKey: jose.JWK;
  private readonly trustedServices: ReadonlyMap<string, jose.JWK>;
  private readonly tokenTtlMs: number;

  constructor(config: ServiceAuthConfig) {
    this.serviceId = config.serviceId;
    this.privateKey = config.privateKey;
    this.trustedServices = config.trustedServices;
    this.tokenTtlMs = config.tokenTtlMs ?? DEFAULT_SERVICE_TOKEN_TTL_MS;
  }

  /**
   * Creates a signed JWT for authenticating to the target service.
   *
   * The token contains iss (this service), aud (target service), a random
   * jti for replay prevention, and iat/exp timestamps.
   *
   * @param targetService - the service ID this token is intended for
   * @returns a signed JWT string
   */
  async createServiceToken(targetService: string): Promise<string> {
    const key = await jose.importJWK(this.privateKey, 'EdDSA');
    const jti = randomUUID();
    const iat = Math.floor(Date.now() / 1_000);
    const exp = iat + Math.floor(this.tokenTtlMs / 1_000);

    return new jose.SignJWT({ jti })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuer(this.serviceId)
      .setAudience(targetService)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(key);
  }

  /**
   * Verifies a service token and extracts its payload.
   *
   * Checks that the token was signed by a trusted service, that the
   * audience matches this service's ID, and that the token has not expired.
   *
   * @param token - the JWT string to verify
   * @returns the token payload on success, or a TokenValidationError
   */
  async verifyServiceToken(
    token: string,
  ): Promise<Result<ServiceTokenPayload, TokenValidationError>> {
    let decoded: jose.JWTPayload;
    try {
      const unverified = jose.decodeJwt(token);
      decoded = unverified;
    } catch {
      return Err(new TokenValidationError('Failed to decode service token'));
    }

    const issuer = decoded.iss;
    if (!issuer) {
      return Err(new TokenValidationError('Service token missing "iss" claim'));
    }

    const trustedKey = this.trustedServices.get(issuer);
    if (!trustedKey) {
      return Err(new TokenValidationError(`Untrusted service: ${issuer}`));
    }

    try {
      const key = await jose.importJWK(trustedKey, 'EdDSA');
      const { payload } = await jose.jwtVerify(token, key, {
        audience: this.serviceId,
      });

      const iss = payload.iss;
      const aud = payload.aud;
      const jti = payload.jti;
      const iat = payload.iat;
      const exp = payload.exp;

      if (!iss || !aud || !jti || iat === undefined || exp === undefined) {
        return Err(new TokenValidationError('Service token missing required claims'));
      }

      const audStr = Array.isArray(aud) ? aud[0] : aud;
      if (!audStr) {
        return Err(new TokenValidationError('Service token has empty audience'));
      }

      return Ok({
        iss,
        aud: audStr,
        jti,
        iat,
        exp,
      });
    } catch (err) {
      if (err instanceof jose.errors.JWTExpired) {
        return Err(new TokenValidationError('Service token has expired'));
      }
      if (err instanceof jose.errors.JWTClaimValidationFailed) {
        return Err(
          new TokenValidationError(`Service token claim validation failed: ${err.message}`),
        );
      }
      return Err(
        new TokenValidationError(
          err instanceof Error ? err.message : 'Service token verification failed',
        ),
      );
    }
  }
}

/**
 * Generates an Ed25519 key pair for service authentication.
 *
 * Returns both keys in JWK format, suitable for storing in configuration
 * or environment variables.
 *
 * @returns an object containing the public and private keys as JWK
 */
export async function generateServiceKeyPair(): Promise<{
  readonly publicKey: jose.JWK;
  readonly privateKey: jose.JWK;
}> {
  const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', {
    crv: 'Ed25519',
    extractable: true,
  });

  const publicJwk = await jose.exportJWK(publicKey);
  const privateJwk = await jose.exportJWK(privateKey);

  return { publicKey: publicJwk, privateKey: privateJwk };
}
