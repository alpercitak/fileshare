# Fileshare

Bun/Turborepo monorepo. `apps/client` is the Preact + Vite + TypeScript browser app (CSS Modules), `apps/server` is a single-file Bun WebSocket signaling server, and `packages/shared` (`@fileshare/shared`) holds the protocol types and `getPort()` used by both. Docker and CI config live in `docker/` and `.github/`.

- Use Bun for dependencies and package scripts.
- Use `@/` for app-local imports in `apps/client`.
- Do not commit generated `dist/` output.
- Commits use Conventional Commits (`type(scope): summary`, scopes `client`, `server`, `shared`, `docker`, `ci`).
- For review, diagnosis, or planning, inspect only. For implementation, preserve unrelated user changes.

## Layout

- `apps/client/src/pages/<name>/index.tsx`: page components.
- `apps/client/src/components/<name>/index.tsx` with `index.module.css` beside it. Access BEM classes as `styles['block__element--modifier']` and use `clsx` for conditional classes.
- `apps/client/src/hooks/useWebRTC.ts`: all signaling, WebRTC, and transfer logic.
- `apps/client/src/utils/`: `binary.ts` (frame encode/decode), `crypto.ts` (ECDH P-256 and AES-GCM via WebCrypto).
- `apps/client/src/types/index.ts`: client-local types.
- `apps/client/src/constants/index.ts`: client tuning values (`CHUNK_SIZE`, `BUFFERED_AMOUNT_HIGH`, `STUN`). Put new ones here, not in components or hooks; suffix time values `Ms` and sizes `Bytes`.
- `apps/server/src/index.ts`: the signaling server. Rooms hold at most two peers (initiator + joiner).
- Protocol message types (`ClientMessage`, `ServerMessage`, `DataChannelMessage`) live only in `packages/shared`. Change the protocol there, not ad hoc in client or server code.
- The server stays a relay: no file data or key material passes through it.

## Implementation

Treat additional code as a cost.
Smallest change that solves the actual task.
Follow existing patterns.
No hypothetical future requirements, no unrelated refactors, no wrapper/factory/dependency for a single use unless it removes concrete complexity today.
Small duplication beats premature abstraction.
Default, not absolute — if the task genuinely needs structure, build it and say why in one line.
Scope is the task, nothing more.
Worth doing but out of scope → mention it, don't implement it.
If the issue is ambiguous, follow existing convention.

## Defensive Programming

Trust internal TypeScript invariants. No assertions/guards/validation/fallbacks for states this codebase already controls, unless you can name the concrete failure prevented. Validate only at real trust boundaries: WebSocket messages arriving at the server, signaling messages arriving at the client, data channel messages from the remote peer, and files picked or dropped by the user. Handle errors only with a real recovery path — otherwise let them propagate. Don't invent recovery, don't swallow, don't build infra for it.

## TypeScript / Preact

Precise types over runtime checks — no `any`, no unnecessary assertions, no non-null assertions where the type can be modeled correctly. No state unless it affects render/behavior. No derived state duplication. No effect where derivation works. No memoization without a concrete problem. New or changed transfer code keeps per-chunk state in refs and updates Preact state at a throttled rate.

## Stopping

Implement, verify with checks, stop. Don't keep hardening or generalizing once it's done — note anything extra you noticed, don't build it.

## Before Finishing

Keep `docs/TODO.md` updated for affected apps: remove completed work and add newly identified remaining work.
Run `bun run lint`, `bun run typecheck`, `bun run build` and `bun run test` before finishing.
Cut from your own diff: unneeded abstractions, redundant guards, one-use helpers, speculative config, unrelated changes, obvious-code comments. Equal correctness → ship the smaller one.
