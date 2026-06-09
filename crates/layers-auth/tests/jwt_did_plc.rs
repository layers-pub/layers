//! End-to-end JWT verification via `did:plc:*` resolution.
//!
//! Mints a real ES256 token whose `iss` is a synthetic `did:plc:*`,
//! hosts the matching DID document at the wiremock URL configured as
//! the PLC directory, and runs the full
//! `verify_jwt` -> `verify_service_auth` chain.

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use layers_auth::did::{DidResolverConfig, DidResolverImpl};
use layers_auth::jwt::verify_jwt;
use layers_auth::verify::verify_service_auth;
use p256::elliptic_curve::JwkEcKey;
use p256::pkcs8::EncodePrivateKey;
use p256::{PublicKey, SecretKey};
use rand::rngs::OsRng;
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

const TEST_DID: &str = "did:plc:abcdefghijklmnopqrstuvwx";

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

#[tokio::test]
async fn signed_jwt_round_trips_against_did_plc() {
    let server = MockServer::start().await;
    let (secret, public) = fresh_keypair();

    Mock::given(method("GET"))
        .and(path(format!("/{TEST_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "@context": ["https://www.w3.org/ns/did/v1"],
            "id": TEST_DID,
            "verificationMethod": [
                {
                    "id": format!("{TEST_DID}#key-1"),
                    "type": "JsonWebKey2020",
                    "publicKeyJwk": jwk_for(&public),
                }
            ]
        })))
        .mount(&server)
        .await;

    let resolver = DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: server.uri(),
        ..DidResolverConfig::default()
    });

    let token = mint(
        &secret,
        TEST_DID,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        300,
    );

    let claims = verify_jwt(&token, &resolver).await.expect("verify ok");
    assert_eq!(claims.iss, TEST_DID);
    verify_service_auth(
        &claims,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        time::OffsetDateTime::now_utc().unix_timestamp(),
    )
    .expect("service auth ok");
}

#[tokio::test]
async fn plc_directory_404_propagates_as_fetch_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path(format!("/{TEST_DID}")))
        .respond_with(ResponseTemplate::new(404))
        .mount(&server)
        .await;

    let resolver = DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: server.uri(),
        ..DidResolverConfig::default()
    });

    let (secret, _public) = fresh_keypair();
    let token = mint(
        &secret,
        TEST_DID,
        "did:web:layers.test",
        "pub.layers.corpus.getCorpus",
        300,
    );

    let err = verify_jwt(&token, &resolver).await.unwrap_err();
    let msg = err.to_string();
    assert!(
        msg.contains("404") || msg.contains("HTTP"),
        "unexpected error: {msg}"
    );
}
