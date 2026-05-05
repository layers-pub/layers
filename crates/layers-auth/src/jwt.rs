//! JWT signature verification against a resolved DID document.
//!
//! Layers tokens are ATProto service-auth JWTs: ES256 (P-256)
//! signatures over a header + claim set whose `iss` is the calling
//! DID and `lxm` is the lexicon method the token authorises.
//! [`verify_jwt`] resolves the issuer's DID document via a
//! [`DidResolver`], picks the verification method whose `kid` matches
//! the token header (or the first method when no `kid` is supplied),
//! then verifies the signature using `jsonwebtoken::decode`.

use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use thiserror::Error;

use crate::did::{DidResolver, ResolveError, VerificationMethod};
use crate::verify::ServiceAuthClaims;

/// Errors raised by [`verify_jwt`].
#[derive(Debug, Error)]
pub enum JwtError {
    /// JWT header could not be parsed.
    #[error("malformed jwt header: {0}")]
    Header(String),
    /// Header declared an algorithm Layers does not accept.
    #[error("unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    /// DID resolution failed.
    #[error("did resolution: {0}")]
    Resolve(#[from] ResolveError),
    /// No verification method matched the JWT's `kid`.
    #[error("no verification method matches kid {kid:?}")]
    KeyNotFound {
        /// `kid` claimed by the JWT header, or `None` when absent.
        kid: Option<String>,
    },
    /// Verification method's JWK could not be turned into a decoding key.
    #[error("public key: {0}")]
    PublicKey(String),
    /// `jsonwebtoken` rejected the signature or claim set.
    #[error("signature verify: {0}")]
    Signature(String),
}

/// Verify a JWT and return the decoded service-auth claims.
///
/// Resolves the issuer (claim `iss`) via `resolver`, picks the
/// verification method matching the JWT header's `kid`, and verifies
/// signature + standard time-window claims. Layers-specific `aud` /
/// `lxm` checks happen in [`crate::verify::verify_service_auth`] and
/// are intentionally separate so the test surface stays orthogonal.
///
/// # Errors
/// See [`JwtError`] variants.
pub async fn verify_jwt<R: DidResolver + ?Sized>(
    token: &str,
    resolver: &R,
) -> Result<ServiceAuthClaims, JwtError> {
    let header = jsonwebtoken::decode_header(token)
        .map_err(|e| JwtError::Header(e.to_string()))?;
    let alg = match header.alg {
        Algorithm::ES256 => header.alg,
        other => return Err(JwtError::UnsupportedAlgorithm(format!("{other:?}"))),
    };

    // Peek at `iss` so we can resolve the document before signature check.
    let claims_peek: ClaimsPeek = peek_claims(token)?;
    let doc = resolver.resolve(&claims_peek.iss).await?;
    let method = pick_method(&doc.verification_method, header.kid.as_deref())?;
    let key = decoding_key_from_method(method, alg)?;

    let mut validation = Validation::new(alg);
    validation.validate_exp = true;
    validation.required_spec_claims.clear();
    validation.required_spec_claims.insert("exp".into());
    validation.set_audience::<&str>(&[]);
    validation.validate_aud = false;

    let data = jsonwebtoken::decode::<ServiceAuthClaims>(token, &key, &validation)
        .map_err(|e| JwtError::Signature(e.to_string()))?;
    Ok(data.claims)
}

#[derive(Debug, Deserialize)]
struct ClaimsPeek {
    iss: String,
}

fn peek_claims(token: &str) -> Result<ClaimsPeek, JwtError> {
    let mut parts = token.split('.');
    let _ = parts.next().ok_or_else(|| JwtError::Header("missing header".into()))?;
    let payload = parts
        .next()
        .ok_or_else(|| JwtError::Header("missing payload".into()))?;
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload.as_bytes(),
    )
    .map_err(|e| JwtError::Header(format!("payload base64: {e}")))?;
    serde_json::from_slice(&bytes).map_err(|e| JwtError::Header(format!("payload json: {e}")))
}

fn pick_method<'a>(
    methods: &'a [VerificationMethod],
    kid: Option<&str>,
) -> Result<&'a VerificationMethod, JwtError> {
    if let Some(kid) = kid {
        return methods
            .iter()
            .find(|m| m.id == kid || m.id.split('#').next_back() == Some(kid))
            .ok_or_else(|| JwtError::KeyNotFound {
                kid: Some(kid.to_owned()),
            });
    }
    methods
        .first()
        .ok_or(JwtError::KeyNotFound { kid: None })
}

fn decoding_key_from_method(
    method: &VerificationMethod,
    alg: Algorithm,
) -> Result<DecodingKey, JwtError> {
    let jwk = &method.public_key_jwk;
    let kty = jwk
        .get("kty")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| JwtError::PublicKey("missing kty".into()))?;
    if kty != "EC" {
        return Err(JwtError::PublicKey(format!("kty {kty} not EC")));
    }
    let crv = jwk
        .get("crv")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| JwtError::PublicKey("missing crv".into()))?;
    match (alg, crv) {
        (Algorithm::ES256, "P-256") => {}
        (a, c) => {
            return Err(JwtError::PublicKey(format!(
                "alg {a:?} does not match crv {c}"
            )));
        }
    }
    let jwk_str = serde_json::to_string(jwk)
        .map_err(|e| JwtError::PublicKey(format!("jwk reserialize: {e}")))?;
    DecodingKey::from_jwk(
        &serde_json::from_str(&jwk_str)
            .map_err(|e| JwtError::PublicKey(format!("jwk parse: {e}")))?,
    )
    .map_err(|e| JwtError::PublicKey(e.to_string()))
}
