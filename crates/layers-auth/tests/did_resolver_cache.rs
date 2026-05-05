//! Verifies the [`DidResolverImpl`] in-process cache.
//!
//! Boots a wiremock server that records every hit on the DID document
//! URL, then resolves the same DID twice through one resolver and
//! confirms the underlying HTTP server saw exactly one request. A
//! fresh resolver with the same DID produces a second hit, ruling out
//! coincidental caching elsewhere.

use layers_auth::did::{DidResolver, DidResolverConfig, DidResolverImpl};
use serde_json::json;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

const TEST_DID: &str = "did:plc:cachecachecachecachecachec";

fn document() -> serde_json::Value {
    json!({
        "@context": ["https://www.w3.org/ns/did/v1"],
        "id": TEST_DID,
        "verificationMethod": [
            {
                "id": format!("{TEST_DID}#k1"),
                "type": "JsonWebKey2020",
                "publicKeyJwk": {
                    "kty": "EC",
                    "crv": "P-256",
                    "x": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                    "y": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
                }
            }
        ]
    })
}

#[tokio::test]
async fn second_resolve_serves_from_cache() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path(format!("/{TEST_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(document()))
        .mount(&server)
        .await;

    let resolver = DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: server.uri(),
        ..DidResolverConfig::default()
    });

    let first = resolver.resolve(TEST_DID).await.expect("first resolve");
    let second = resolver.resolve(TEST_DID).await.expect("second resolve");
    assert_eq!(first.verification_method.len(), 1);
    assert_eq!(
        first.verification_method[0].id,
        second.verification_method[0].id
    );

    let received = server.received_requests().await.unwrap();
    let count = received
        .iter()
        .filter(|r| r.url.path() == format!("/{TEST_DID}"))
        .count();
    assert_eq!(count, 1, "expected exactly one HTTP fetch; got {count}");
}

#[tokio::test]
async fn fresh_resolver_does_not_share_cache() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path(format!("/{TEST_DID}")))
        .respond_with(ResponseTemplate::new(200).set_body_json(document()))
        .mount(&server)
        .await;

    let one = DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: server.uri(),
        ..DidResolverConfig::default()
    });
    one.resolve(TEST_DID).await.expect("one resolve");
    let two = DidResolverImpl::with_config(DidResolverConfig {
        plc_directory: server.uri(),
        ..DidResolverConfig::default()
    });
    two.resolve(TEST_DID).await.expect("two resolve");

    let received = server.received_requests().await.unwrap();
    let count = received
        .iter()
        .filter(|r| r.url.path() == format!("/{TEST_DID}"))
        .count();
    assert_eq!(count, 2, "fresh resolvers should each fetch once");
}
