//! Mint ATProto service-auth JWTs for outbound calls.
//!
//! The orchestrator and observer occasionally need to call out to a
//! PDS (e.g. to fetch a record on demand or to publish an observation
//! report). Those calls require a service-auth JWT signed with the
//! caller's private key. [`ServiceAuthSigner`] mints those tokens.
//!
//! Convention (matches `verify_service_auth`):
//!
//! - `alg`: `ES256` (P-256 ECDSA + SHA-256). Other algorithms are
//!   rejected on the verify side, so we never mint them.
//! - Header `kid`: the verification method id from the issuer's DID
//!   document, e.g. `did:web:layers.pub#key-1`.
//! - `iss`: the calling DID.
//! - `aud`: the receiving service's DID.
//! - `lxm`: the lexicon method id this token authorises.
//! - `iat` / `exp`: seconds since the Unix epoch. Default `exp` is 60s
//!   from `iat`; tokens are short-lived by design.
//! - `jti`: a UUIDv4 nonce.
//!
//! The signer is stateless beyond the loaded private key; mint as
//! many tokens as needed.

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde::Serialize;
use thiserror::Error;
use uuid::Uuid;

/// Errors raised by [`ServiceAuthSigner::mint`].
#[derive(Debug, Error)]
pub enum SignError {
    /// The supplied PEM did not parse as an ES256 (P-256) key.
    #[error("load key: {0}")]
    LoadKey(String),
    /// `jsonwebtoken` failed to encode the JWT.
    #[error("encode: {0}")]
    Encode(#[from] jsonwebtoken::errors::Error),
    /// The clock returned a pre-epoch instant.
    #[error("clock returned an instant before the unix epoch")]
    ClockPreEpoch,
}

/// Configuration for a single mint.
#[derive(Debug, Clone)]
pub struct MintRequest<'a> {
    /// `iss` claim — the calling DID.
    pub issuer: &'a str,
    /// `aud` claim — the receiving service's DID.
    pub audience: &'a str,
    /// `lxm` claim — the lexicon method id.
    pub method: &'a str,
    /// Token lifetime. Defaults to 60 seconds when [`None`].
    pub ttl: Option<std::time::Duration>,
}

/// Service-auth signer.
///
/// Construction is fallible because the PEM has to round-trip through
/// `jsonwebtoken::EncodingKey`'s P-256 loader.
#[derive(Clone)]
pub struct ServiceAuthSigner {
    key: EncodingKey,
    /// Verification method id, surfaced as the JWT header's `kid`.
    pub kid: String,
}

impl std::fmt::Debug for ServiceAuthSigner {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ServiceAuthSigner")
            .field("kid", &self.kid)
            .finish()
    }
}

impl ServiceAuthSigner {
    /// Build a signer from a PKCS#8-encoded P-256 PEM and the
    /// corresponding verification method id (`kid`).
    ///
    /// # Errors
    /// Returns [`SignError::LoadKey`] when the PEM is not a valid
    /// PKCS#8 P-256 private key.
    pub fn from_pem(pem: &[u8], kid: impl Into<String>) -> Result<Self, SignError> {
        let key = EncodingKey::from_ec_pem(pem)
            .map_err(|e| SignError::LoadKey(e.to_string()))?;
        Ok(Self {
            key,
            kid: kid.into(),
        })
    }

    /// Mint a JWT bound to the supplied (issuer, audience, method)
    /// triple. The `iat` claim is set to the current wall clock and
    /// `exp` is `iat + ttl` (default 60s).
    ///
    /// # Errors
    /// Returns [`SignError::Encode`] on any underlying signing
    /// failure, or [`SignError::ClockPreEpoch`] if the system clock
    /// is implausibly far in the past.
    pub fn mint(&self, request: &MintRequest<'_>) -> Result<String, SignError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| SignError::ClockPreEpoch)?;
        let ttl = request.ttl.unwrap_or(std::time::Duration::from_secs(60));
        let claims = Claims {
            iss: request.issuer,
            aud: request.audience,
            lxm: request.method,
            iat: now.as_secs(),
            exp: (now + ttl).as_secs(),
            jti: Uuid::new_v4().to_string(),
        };
        let mut header = Header::new(Algorithm::ES256);
        header.kid = Some(self.kid.clone());
        Ok(jsonwebtoken::encode(&header, &claims, &self.key)?)
    }
}

#[derive(Debug, Serialize)]
struct Claims<'a> {
    iss: &'a str,
    aud: &'a str,
    lxm: &'a str,
    iat: u64,
    exp: u64,
    jti: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::verify::{ServiceAuthClaims, verify_service_auth};
    use jsonwebtoken::{DecodingKey, Validation};
    use p256::pkcs8::EncodePrivateKey;
    use p256::{PublicKey, SecretKey};
    use rand::rngs::OsRng;

    fn fresh_keypair() -> (SecretKey, PublicKey) {
        let secret = SecretKey::random(&mut OsRng);
        let public = secret.public_key();
        (secret, public)
    }

    fn signer_from(secret: &SecretKey, kid: &str) -> ServiceAuthSigner {
        let pem = secret
            .to_pkcs8_pem(p256::pkcs8::LineEnding::LF)
            .expect("pem");
        ServiceAuthSigner::from_pem(pem.as_bytes(), kid).expect("signer")
    }

    fn jwk_for(public: &PublicKey) -> serde_json::Value {
        let jwk: p256::elliptic_curve::JwkEcKey = public.into();
        serde_json::to_value(jwk).expect("jwk -> value")
    }

    #[test]
    fn mint_round_trips_through_verify_service_auth() {
        let (secret, public) = fresh_keypair();
        let signer = signer_from(&secret, "did:web:caller#key-1");

        let token = signer
            .mint(&MintRequest {
                issuer: "did:web:caller",
                audience: "did:web:callee",
                method: "pub.layers.corpus.getCorpus",
                ttl: Some(std::time::Duration::from_secs(120)),
            })
            .expect("mint");

        // Decode against the public key directly to confirm the
        // signature + claim payload.
        let jwk_value = jwk_for(&public);
        let jwk_str = serde_json::to_string(&jwk_value).expect("jwk str");
        let jwk = serde_json::from_str(&jwk_str).expect("jwk");
        let key = DecodingKey::from_jwk(&jwk).expect("decoding key");

        let mut validation = Validation::new(Algorithm::ES256);
        validation.validate_aud = false;
        let token_data = jsonwebtoken::decode::<ServiceAuthClaims>(&token, &key, &validation)
            .expect("decode");

        assert_eq!(token_data.claims.iss, "did:web:caller");
        assert_eq!(token_data.claims.aud, "did:web:callee");
        assert_eq!(token_data.claims.lxm, "pub.layers.corpus.getCorpus");

        // The full Layers-side check should accept the token.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        verify_service_auth(
            &token_data.claims,
            "did:web:callee",
            "pub.layers.corpus.getCorpus",
            now,
        )
        .expect("verify_service_auth ok");
    }

    #[test]
    fn mint_default_ttl_is_60_seconds() {
        let (secret, _public) = fresh_keypair();
        let signer = signer_from(&secret, "did:web:caller#key-1");
        let token = signer
            .mint(&MintRequest {
                issuer: "did:web:caller",
                audience: "did:web:callee",
                method: "pub.layers.corpus.getCorpus",
                ttl: None,
            })
            .expect("mint");
        // Decode without verifying the signature so we only inspect
        // the payload window.
        let parts: Vec<&str> = token.split('.').collect();
        let payload =
            base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, parts[1])
                .expect("payload b64");
        let claims: serde_json::Value = serde_json::from_slice(&payload).expect("payload json");
        let iat = claims["iat"].as_u64().unwrap();
        let exp = claims["exp"].as_u64().unwrap();
        assert_eq!(exp - iat, 60);
    }

    #[test]
    fn rejects_invalid_pem() {
        let err = ServiceAuthSigner::from_pem(b"not a pem", "did:web:x#kid").unwrap_err();
        assert!(matches!(err, SignError::LoadKey(_)));
    }
}
