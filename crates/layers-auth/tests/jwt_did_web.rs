//! End-to-end JWT verification: mint a real ES256 token, host a real
//! DID document at the matching `did:web` URL via wiremock, and run it
//! through [`layers_auth::jwt::verify_jwt`].

use std::sync::Arc;

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use layers_auth::did::{DidResolver, DidWebResolver};
use layers_auth::jwt::{JwtError, verify_jwt};
use layers_auth::verify::verify_service_auth;
use p256::elliptic_curve::JwkEcKey;
use p256::pkcs8::EncodePrivateKey;
use p256::{PublicKey, SecretKey};
use rand::rngs::OsRng;
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn fresh_keypair() -> (SecretKey, PublicKey) {
    let secret = SecretKey::random(&mut OsRng);
    let public = secret.public_key();
    (secret, public)
}

fn pem_for(secret: &SecretKey) -> String {
    secret
        .to_pkcs8_pem(p256::pkcs8::LineEnding::LF)
        .expect("pem")
        .to_string()
}

fn jwk_for(public: &PublicKey) -> serde_json::Value {
    let jwk: JwkEcKey = public.into();
    serde_json::to_value(jwk).expect("jwk -> value")
}

fn mint(secret: &SecretKey, issuer: &str, aud: &str, lxm: &str, exp_offset_secs: i64) -> String {
    let exp = (time::OffsetDateTime::now_utc().unix_timestamp() + exp_offset_secs) as usize;
    let iat = time::OffsetDateTime::now_utc().unix_timestamp() as usize;
    let claims = json!({
        "iss": issuer,
        "aud": aud,
        "lxm": lxm,
        "exp": exp,
        "iat": iat,
    });
    let pem = pem_for(secret);
    let key = EncodingKey::from_ec_pem(pem.as_bytes()).expect("encoding key");
    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some("key-1".into());
    jsonwebtoken::encode(&header, &claims, &key).expect("sign jwt")
}

async fn mock_did_doc(server: &MockServer, jwk: serde_json::Value) {
    Mock::given(method("GET"))
        .and(path("/.well-known/did.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "@context": ["https://www.w3.org/ns/did/v1"],
            "id": "did:web:placeholder",
            "verificationMethod": [
                {
                    "id": "did:web:placeholder#key-1",
                    "type": "JsonWebKey2020",
                    "publicKeyJwk": jwk,
                }
            ]
        })))
        .mount(server)
        .await;
}

#[tokio::test]
async fn signed_jwt_round_trips_against_did_web() {
    let server = MockServer::start().await;
    let (secret, public) = fresh_keypair();
    mock_did_doc(&server, jwk_for(&public)).await;

    let host = server.address();
    let issuer = format!("did:web:{}%3A{}", host.ip(), host.port());

    let token = mint(
        &secret,
        &issuer,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        300,
    );

    let resolver = test_resolver(&server.uri());
    let claims = verify_jwt(&token, &resolver).await.expect("verify ok");
    assert_eq!(claims.iss, issuer);
    assert_eq!(claims.aud, "did:web:layers.test");
    assert_eq!(claims.lxm, "pub.layers.corpus.getCorpus");

    verify_service_auth(
        &claims,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        time::OffsetDateTime::now_utc().unix_timestamp(),
    )
    .expect("service auth ok");
}

#[tokio::test]
async fn tampered_payload_rejected() {
    let server = MockServer::start().await;
    let (secret, public) = fresh_keypair();
    mock_did_doc(&server, jwk_for(&public)).await;

    let host = server.address();
    let issuer = format!("did:web:{}%3A{}", host.ip(), host.port());
    let token = mint(
        &secret,
        &issuer,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        300,
    );
    // Flip a bit in the payload section.
    let parts: Vec<&str> = token.split('.').collect();
    let mut payload = parts[1].to_owned();
    payload.push_str("AAAA");
    let bad = format!("{}.{}.{}", parts[0], payload, parts[2]);

    let resolver = test_resolver(&server.uri());
    let err = verify_jwt(&bad, &resolver).await.unwrap_err();
    assert!(matches!(err, JwtError::Header(_) | JwtError::Signature(_)));
}

#[tokio::test]
async fn expired_token_rejected() {
    let server = MockServer::start().await;
    let (secret, public) = fresh_keypair();
    mock_did_doc(&server, jwk_for(&public)).await;

    let host = server.address();
    let issuer = format!("did:web:{}%3A{}", host.ip(), host.port());
    let token = mint(
        &secret,
        &issuer,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        -3600,
    );

    let resolver = test_resolver(&server.uri());
    let err = verify_jwt(&token, &resolver).await.unwrap_err();
    assert!(matches!(err, JwtError::Signature(_)));
}

#[tokio::test]
async fn alg_other_than_es256_rejected() {
    // Build a header that claims HS256 but no payload/signature.
    let header_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        br#"{"alg":"HS256","typ":"JWT"}"#,
    );
    let payload_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        br#"{"iss":"did:web:layers.test"}"#,
    );
    let token = format!("{header_b64}.{payload_b64}.AAAA");

    let resolver = NullResolver;
    let err = verify_jwt(&token, &resolver).await.unwrap_err();
    assert!(matches!(err, JwtError::UnsupportedAlgorithm(_)));
}

/// `DidResolver` that always succeeds, for the alg-rejection test that
/// never actually reaches the resolver.
#[derive(Default)]
struct NullResolver;

#[async_trait::async_trait]
impl DidResolver for NullResolver {
    async fn resolve(
        &self,
        _did: &str,
    ) -> Result<layers_auth::did::DidDocument, layers_auth::did::ResolveError> {
        unreachable!("resolver should not be reached for unsupported alg")
    }
}

/// `DidWebResolver` rebound onto an `http://localhost:<port>` base URL
/// so wiremock receives the request without TLS. Implemented as a
/// custom resolver that overrides the URL transform from the spec
/// canonical scheme.
fn test_resolver(base: &str) -> TestResolver {
    TestResolver {
        base: base.trim_end_matches('/').to_owned(),
    }
}

struct TestResolver {
    base: String,
}

#[async_trait::async_trait]
impl DidResolver for TestResolver {
    async fn resolve(
        &self,
        _did: &str,
    ) -> Result<layers_auth::did::DidDocument, layers_auth::did::ResolveError> {
        let url = format!("{}/.well-known/did.json", self.base);
        let body = reqwest::get(&url)
            .await
            .map_err(|e| layers_auth::did::ResolveError::Fetch(e.to_string()))?
            .text()
            .await
            .map_err(|e| layers_auth::did::ResolveError::Fetch(e.to_string()))?;
        serde_json::from_str(&body)
            .map_err(|e| layers_auth::did::ResolveError::Parse(e.to_string()))
    }
}

/// Suppress "unused" warning on the production resolver in this test
/// file; the production resolver is exercised via the trait surface.
#[allow(dead_code)]
fn _ensure_prod_resolver_compiles() {
    let _: Arc<dyn DidResolver> = Arc::new(DidWebResolver::new());
}
