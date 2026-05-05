---
sidebar_label: Technology Stack
sidebar_position: 2
---

# Technology Stack

## Backend (Rust workspace)

| Concern         | Crate / library                                                  |
| --------------- | ---------------------------------------------------------------- |
| Language        | Rust, edition 2024, channel 1.95                                 |
| Metaframework   | `idiolect` v0.7.0 (path dep)                                     |
| Schema codegen  | `panproto` v0.39.0 (via idiolect)                                |
| HTTP framework  | `axum` + `tower-http` (request id, tracing, cors)                |
| Async runtime   | `tokio` multi-thread                                             |
| Postgres        | `sqlx` (runtime-tokio-rustls)                                    |
| Elasticsearch   | `reqwest` (REST `_doc` + JSONB body)                             |
| Neo4j           | `reqwest` (`db/<name>/tx/commit` cypher endpoint)                |
| Redis           | `redis` (connection-manager pool, Tokio rustls comp)             |
| Auth            | `jsonwebtoken` ES256 + `p256` JWK + custom `did:web` resolver    |
| Observability   | `tracing` + `tracing-subscriber` (json output)                   |
| Testing         | `cargo test`, `testcontainers` (Postgres), `wiremock` (HTTP)     |

## Frontend

| Concern       | Library                                          |
| ------------- | ------------------------------------------------ |
| Framework     | Next.js 15 (App Router) + React 19               |
| State / data  | TanStack Query 5                                 |
| API client    | `openapi-fetch` (typed against the orchestrator) |
| UI primitives | shadcn/ui + Radix UI                             |
| Styling       | Tailwind CSS 4                                   |
| Auth          | `@atproto/oauth-client-browser`                  |
| Testing       | Vitest, Playwright, Storybook 8                  |

## Build and CI

- Cargo workspace at `layers/`; `cargo check --workspace` and
  `cargo test --workspace` cover every crate and feature combination.
- `panproto-check` GitHub Action gates breaking lexicon changes via
  `idiolect-codegen check-compat`.
- pnpm workspace in `web/` for the frontend.
