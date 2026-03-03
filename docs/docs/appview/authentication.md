---
sidebar_label: Authentication
sidebar_position: 8
---

# Authentication and Authorization

## ATProto OAuth 2.0

The appview authenticates users via ATProto's OAuth 2.0 + PKCE flow, using `@atproto/oauth-client-node`. The user's DID (Decentralized Identifier) serves as their identity across the protocol.

### OAuth Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant A as Layers AppView
    participant PDS as User's PDS
    participant PLC as PLC Directory

    U->>A: Click "Sign in with ATProto"
    A->>PLC: Resolve DID → PDS URL
    PLC-->>A: PDS endpoint
    A->>PDS: Authorization request (PKCE challenge)
    PDS-->>U: Redirect to PDS login
    U->>PDS: Authenticate
    PDS-->>U: Redirect back with auth code
    U->>A: Auth code + PKCE verifier
    A->>PDS: Exchange code for tokens
    PDS-->>A: Access token + refresh token
    A->>A: Create JWT session
    A-->>U: Set session cookie
```

### DID Resolution

The appview resolves DIDs via the PLC Directory (default: `https://plc.directory`). DID documents contain the user's PDS endpoint URL and signing key. Resolution results are cached in Redis with a 1-hour TTL.

### Token Management

Access tokens from the PDS are short-lived. The appview uses `@atproto/oauth-client-node` to handle token refresh automatically. Session state (tokens, DID, handle) is encrypted with `SESSION_SECRET` and stored in Redis.

## JWT Sessions

After OAuth authentication, the appview issues its own JWT session token (via the `jose` library) that is sent as an HTTP-only cookie or `Authorization: Bearer` header.

| Field | Value |
|---|---|
| `sub` | User's DID (`did:plc:...`) |
| `handle` | User's ATProto handle |
| `iat` | Issued-at timestamp |
| `exp` | Expiration (default: 24 hours) |
| `iss` | AppView service DID |

Tokens are signed with `JWT_SECRET` (HS256). Session refresh extends the expiration without re-authenticating against the PDS.

## Authorization Model

### Casbin RBAC

The appview uses [Casbin](https://casbin.org/) for role-based access control. Policies are defined in a model file and loaded at startup.

**Policy Model:**

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

### Role Definitions

| Role | Description | Permissions |
|---|---|---|
| `reader` | Default for all authenticated users | Read all public records, search, browse |
| `annotator` | Can create annotation data | Reader + create expressions, segmentations, annotation layers, alignments |
| `corpus_manager` | Can organize corpora | Annotator + create/manage corpora, memberships, ontologies |
| `experimenter` | Can run judgment experiments | Annotator + create experiment definitions, templates, fillings |
| `administrator` | Full access | All operations including user management and system configuration |

### Policy Rules

```csv
p, reader, records, read
p, annotator, expression, create
p, annotator, segmentation, create
p, annotator, annotationLayer, create
p, annotator, alignment, create
p, annotator, graphEdge, create
p, annotator, persona, create
p, corpus_manager, corpus, create
p, corpus_manager, membership, create
p, corpus_manager, ontology, create
p, corpus_manager, typeDef, create
p, experimenter, experimentDef, create
p, experimenter, template, create
p, experimenter, filling, create
p, experimenter, judgmentSet, create
p, administrator, *, *
g, annotator, reader
g, corpus_manager, annotator
g, experimenter, annotator
g, administrator, corpus_manager
g, administrator, experimenter
```

Role inheritance: `administrator` inherits from `corpus_manager` and `experimenter`, which both inherit from `annotator`, which inherits from `reader`.

### Per-Corpus Permissions

Beyond global roles, corpus owners can grant per-corpus permissions. A corpus owner can designate specific DIDs as annotators or adjudicators for their corpus. These permissions are stored in the `corpus.corpus` record's `annotationDesign` field and enforced at the API layer.

## Multi-Factor Authentication

### WebAuthn/FIDO2

The appview supports hardware security keys and biometric authentication via `@simplewebauthn/server`. Users can register one or more WebAuthn credentials and use them as a second factor during login.

### TOTP

Time-based one-time passwords are supported via `@otplib`. Users scan a QR code in their authenticator app and enter 6-digit codes during login.

MFA is optional by default and can be enforced per-role by the administrator.

## Security Considerations

### Rate Limiting

See [API Design](./api-design) for tiered rate limiting by authentication status.

### Input Validation

All user input is validated through Zod schemas before reaching any database. AT-URIs, DIDs, and other protocol identifiers are validated against their format specifications.

### CORS

The appview allows cross-origin requests only from configured origins. The default configuration permits requests from the Layers web frontend domain.

### Secrets Management

| Secret | Storage |
|---|---|
| `JWT_SECRET` | Environment variable (dev), External Secrets Operator (production) |
| `SESSION_SECRET` | Environment variable (dev), External Secrets Operator (production) |
| `OAUTH_CLIENT_SECRET` | Environment variable (dev), External Secrets Operator (production) |
| Database credentials | Environment variable (dev), External Secrets Operator (production) |

No secrets are stored in code or version control. Production deployments use the [External Secrets Operator](https://external-secrets.io/) to inject secrets from a vault (e.g., HashiCorp Vault, AWS Secrets Manager) into Kubernetes pods.

## See Also

- [API Design](./api-design) for how authentication middleware integrates with endpoints
- [Deployment](./deployment) for production secrets management
- [Technology Stack](./technology-stack) for library versions
