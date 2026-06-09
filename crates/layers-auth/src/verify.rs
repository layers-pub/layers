//! Service-auth verification.
//!
//! `ATProto` service-auth tokens are JWTs whose `lxm` claim names the single
//! XRPC method the token is valid for. Layers follows the Chive enforcement
//! pattern (see `~/chive/src/auth/service-auth/service-auth-verifier.ts`):
//! the orchestrator middleware pulls the Bearer token, decodes the JWT, and
//! rejects the request if `lxm` does not match the method about to dispatch.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Minimal claim set Layers reads off a service-auth JWT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceAuthClaims {
    /// Issuer DID (the calling service).
    pub iss: String,
    /// Audience DID (must equal the Layers appview DID).
    pub aud: String,
    /// Lexicon method this token authorises.
    pub lxm: String,
    /// Expiry (unix seconds).
    pub exp: i64,
    /// Not-before (unix seconds). Optional.
    #[serde(default)]
    pub nbf: Option<i64>,
}

/// Errors from [`verify_service_auth`].
#[derive(Debug, Error)]
pub enum VerifyError {
    /// Token could not be decoded or its signature did not verify.
    #[error("invalid token: {0}")]
    InvalidToken(String),
    /// `aud` claim did not match this service DID.
    #[error("wrong audience: expected {expected}, got {actual}")]
    WrongAudience {
        /// Audience the appview expected (its own DID).
        expected: String,
        /// Audience carried on the token.
        actual: String,
    },
    /// `lxm` claim did not match the method being invoked.
    #[error("wrong lxm: expected {expected}, got {actual}")]
    WrongLxm {
        /// Method the gateway is dispatching.
        expected: String,
        /// Method the token authorises.
        actual: String,
    },
    /// Token is expired.
    #[error("token expired at {exp}")]
    Expired {
        /// Expiry the token carried (unix seconds).
        exp: i64,
    },
    /// Token's `nbf` (not before) claim is in the future.
    #[error("token not yet valid (nbf={nbf}, now={now})")]
    NotYetValid {
        /// Earliest moment the token is valid (unix seconds).
        nbf: i64,
        /// Current wall clock the verifier saw (unix seconds).
        now: i64,
    },
}

/// Verify a decoded claim set against the method the caller intends to invoke.
///
/// Signature verification is caller-supplied — wire the appropriate
/// `jsonwebtoken::decode` path in the middleware so this function stays
/// dependency-light and unit-testable.
///
/// # Errors
/// See [`VerifyError`] variants.
pub fn verify_service_auth(
    claims: &ServiceAuthClaims,
    expected_aud: &str,
    expected_lxm: &str,
    now_unix: i64,
) -> Result<(), VerifyError> {
    if claims.aud != expected_aud {
        return Err(VerifyError::WrongAudience {
            expected: expected_aud.to_owned(),
            actual: claims.aud.clone(),
        });
    }
    if claims.exp <= now_unix {
        return Err(VerifyError::Expired { exp: claims.exp });
    }
    if let Some(nbf) = claims.nbf
        && nbf > now_unix
    {
        return Err(VerifyError::NotYetValid { nbf, now: now_unix });
    }
    if claims.lxm != expected_lxm {
        return Err(VerifyError::WrongLxm {
            expected: expected_lxm.to_owned(),
            actual: claims.lxm.clone(),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims(lxm: &str, aud: &str, exp: i64) -> ServiceAuthClaims {
        ServiceAuthClaims {
            iss: "did:example:caller".into(),
            aud: aud.into(),
            lxm: lxm.into(),
            exp,
            nbf: None,
        }
    }

    #[test]
    fn accepts_matching_lxm() {
        let c = claims(
            "pub.layers.annotation.getAnnotationLayer",
            "did:web:layers.pub",
            9_999_999_999,
        );
        verify_service_auth(
            &c,
            "did:web:layers.pub",
            "pub.layers.annotation.getAnnotationLayer",
            0,
        )
        .unwrap();
    }

    #[test]
    fn rejects_mismatched_lxm() {
        let c = claims(
            "pub.layers.annotation.getAnnotationLayer",
            "did:web:layers.pub",
            9_999_999_999,
        );
        let err = verify_service_auth(
            &c,
            "did:web:layers.pub",
            "pub.layers.ontology.getOntology",
            0,
        )
        .unwrap_err();
        assert!(matches!(err, VerifyError::WrongLxm { .. }));
    }

    #[test]
    fn rejects_expired() {
        let c = claims("x", "did:web:layers.pub", 100);
        let err = verify_service_auth(&c, "did:web:layers.pub", "x", 200).unwrap_err();
        assert!(matches!(err, VerifyError::Expired { .. }));
    }

    #[test]
    fn rejects_wrong_audience() {
        let c = claims("x", "did:web:other.example", 9_999_999_999);
        let err = verify_service_auth(&c, "did:web:layers.pub", "x", 0).unwrap_err();
        assert!(matches!(err, VerifyError::WrongAudience { .. }));
    }

    #[test]
    fn rejects_token_with_future_nbf() {
        let mut c = claims("x", "did:web:layers.pub", 9_999_999_999);
        c.nbf = Some(2_000);
        let err = verify_service_auth(&c, "did:web:layers.pub", "x", 1_000).unwrap_err();
        match err {
            VerifyError::NotYetValid { nbf, now } => {
                assert_eq!(nbf, 2_000);
                assert_eq!(now, 1_000);
            }
            other => panic!("expected NotYetValid, got {other:?}"),
        }
    }

    #[test]
    fn admits_token_with_past_nbf() {
        let mut c = claims("x", "did:web:layers.pub", 9_999_999_999);
        c.nbf = Some(500);
        verify_service_auth(&c, "did:web:layers.pub", "x", 1_000).unwrap();
    }

    #[test]
    fn admits_token_without_nbf() {
        let c = claims("x", "did:web:layers.pub", 9_999_999_999);
        assert!(c.nbf.is_none());
        verify_service_auth(&c, "did:web:layers.pub", "x", 1_000).unwrap();
    }

    #[test]
    fn rejects_token_at_exact_expiry() {
        // exp <= now should reject; the boundary is exclusive of the
        // expiry second so a clock that ticks past `exp` invalidates
        // the token immediately.
        let c = claims("x", "did:web:layers.pub", 1_000);
        let err = verify_service_auth(&c, "did:web:layers.pub", "x", 1_000).unwrap_err();
        assert!(matches!(err, VerifyError::Expired { exp: 1_000 }));
    }
}
