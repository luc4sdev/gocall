# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pinned `pnpm@8.15.5`). Do not use npm/yarn.

- `pnpm dev` — dev server (http://localhost:3000)
- `pnpm build` — production build (`prisma generate` runs automatically via `postinstall`)
- `pnpm lint` — ESLint (`eslint-config-next`, flat config in `eslint.config.mjs`)
- `pnpm start` — serve the production build

### Database (Prisma 7 + Postgres)

- `pnpm db:up` — start local Postgres via Docker (`docker-compose.yml`, exposed on host port **5433**)
- `pnpm db:migrate` — create/apply a dev migration (`prisma migrate dev`)
- `pnpm db:migrate:deploy` — apply pending migrations (CI/prod)
- `pnpm db:seed` — run `prisma/seed.ts` (via `tsx`); seed command is configured in `prisma.config.ts`, not `package.json`
- `pnpm db:studio` — Prisma Studio

The Prisma client is generated to `app/generated/prisma/` (git-ignored, custom `output` in the schema). Import it only through `lib/prisma.ts` (`import { prisma } from '@/lib/prisma'`), never directly from the generated path.

### Tests

No test framework is configured. `tsc` is `noEmit`; type-check with `pnpm build` or `npx tsc`.

## Environment

Required in `.env` (see `.env` for the current set):

- `DATABASE_URL` — Postgres connection string
- `AUTH_SECRET` — HMAC key for session JWTs
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — server-side LiveKit credentials
- `NEXT_PUBLIC_LIVEKIT_URL` — LiveKit `ws(s)://` URL (also reused server-side, rewritten to `http` in `lib/livekit-admin.ts`)

## Architecture

Next.js 16 (App Router) + React 19 Discord-style app: text/voice channels in a server, plus friends and 1:1 DMs/calls. Real-time features do **not** use a custom WebSocket or polling layer — they ride on **LiveKit**.

### The global lobby pattern (key concept)

On load, `app/(app)/layout.tsx` (a server component that gates on the session and picks the first `Server`) renders `components/AppShell.tsx`, which connects every logged-in user to a single always-on LiveKit room: **`gocall-global-lobby`**. That one room is the transport for:

- **Text chat & DMs** — `useChat()` from `@livekit/components-react`. Messages carry attributes (e.g. `recipientId` for DMs) to route/filter client-side. `DirectMessageWatcher` and `ChannelView`/`DirectMessageView` all read the same `chatMessages` stream.
- **Call signaling** — `CallSignalBridge` publishes/receives JSON on the LiveKit data channel under topic `gocall-call-signal` (`invite`/`accept`/`decline`/`cancel`/`timeout`/`busy`/`end`), targeted with `destinationIdentities`. Private-call state machine lives in `components/call/usePrivateCall.ts`; private-call "channels" are pseudo-IDs prefixed `dm-call:`.
- **Channel create/delete sync** — `ChannelSyncBridge`, topic `gocall-channel-sync`, so other clients update their sidebar without a refetch.

Components named `*Bridge` follow a convention: they sit inside a LiveKit room context, expose an imperative `send`/`broadcast` via an `onReady` callback, and forward inbound events via `onMessage`/`onSignal`. They render `null`.

**No server-side authorization on the lobby's data/chat channels.** LiveKit's data channel and `useChat()` don't know what a "friend" is — any authenticated client can `publishData`/`send()` a DM- or invite-shaped packet addressed to any other identity, bypassing the UI entirely. The persistence routes (`POST /api/dm/[friendId]/messages`, etc.) do check `Friendship.status === 'ACCEPTED'` server-side, but *live* delivery (toasts, call invites, unread badges) does not — LiveKit just delivers whatever's published. `AppShell` maintains a `friendIds: Set<string>` (fetched once via `/api/friends` on mount, kept fresh by `FriendsShell` after every refetch, exposed through `AppContext` and mirrored into a ref for non-reactive reads) specifically so consumers of inbound lobby signals — `usePrivateCall`'s `invite` handler, `DirectMessageWatcher` — can silently drop senders that aren't real friends before reacting. Any new feature that reacts to inbound lobby signals should do the same check; it's a mitigation, not a real security boundary (nothing stops a crafted packet from being *sent*, only from being *acted on* by a well-behaved client).

**Renaming `LOBBY_ROOM_NAME` is a breaking change for open tabs.** Every client publishes/reads presence and signaling on that one room name. A tab that's already open when a deploy changes the name keeps running the old bundle and stays connected to the *old* room until it reloads — it won't see, or be seen by, clients on the new name. This has actually happened in prod (a `lobby-${homeServerId}` → `gocall-global-lobby` rename split presence between refreshed and stale tabs until everyone reloaded). Per-channel voice rooms are unaffected (keyed by `Channel.roomName`, unrelated to the lobby's name) — only lobby-driven presence/signaling breaks during the transition.

### Voice channels

Each `VOICE` channel is its own LiveKit room, identified by `Channel.roomName`, joined on demand (`VoiceChannelGate` → `onJoinVoice` in `AppShell`). Voice tokens are cached per-room in `AppShell`. `lib/livekit-admin.ts` (`RoomServiceClient`) is used server-side to check whether a room still has participants.

LiveKit `AccessToken`s default to a 6h TTL (never overridden in `GET /api/livekit`). Both the lobby and per-channel voice rooms use `RoomReconnectBridge` (`components/layout/RoomReconnectBridge.tsx`) to detect a `Disconnected` room event and fetch a fresh token via `/api/livekit?room=...` with exponential backoff — this is what makes calls survive a long session past the token's expiry. Private calls (`components/call/usePrivateCall.ts`) reuse this same mechanism unchanged: their `voiceChannel` is a pseudo-`ChannelDTO` whose `roomName` is a `dm-call:<uuid>` id, so the reconnect bridge just treats it like any other room.

**Presence attributes are server-channel-only by convention.** `LobbyPresence` (`components/call/LobbyPresence.tsx`) publishes `inCall`/`voiceChannelId`/`screenSharing` participant attributes on the lobby room, and several UI surfaces key off them (`AppShell`'s home-server hover badge, `MembersSidebar`, `FriendsCallSidebar`, the screen-share-thumbnail request/broadcast in `ScreenShareThumbnailBridge`). These are meant to describe real server voice channels, not private calls — `AppShell` computes `serverVoiceChannelId` by excluding private-call pseudo-channels (`isPrivateCallChannelId(voiceChannel.id)`) before passing anything to `LobbyPresence`. Without that gate, a private call would show up as "in a server call" in those surfaces, and its screen-share thumbnail would broadcast to every lobby participant, not just the other party. Any new attribute added to `LobbyPresence` needs the same gate if it's meant to be server-channel-specific.

### Persistence vs. transport

The REST API (`app/api/**/route.ts`) + Prisma is the source of truth for **history and durable state** (message backfill, friendships, channels). Live delivery of new messages/events is LiveKit. When adding a chat-like feature, expect to write to both: POST to persist, and rely on the LiveKit stream for the live update.

History endpoints (`GET /api/channels/[channelId]/messages`, `GET /api/dm/[friendId]/messages`) fetch the *most recent* `HISTORY_LIMIT` (100) rows: `orderBy: 'desc'` + `take` + `.reverse()` before mapping to DTOs. Don't write this as `orderBy: 'asc'` + `take` — that returns the **oldest** rows ever created, not the most recent ones, and silently strands anyone with more than 100 messages of history on the very beginning of the conversation. (This was a real bug, fixed in both routes.)

### Auth

- Sessions are JWTs (`jose`, HS256) in the `gocall_session` httpOnly cookie. Sign/verify helpers and `sessionCookieOptions` are in `lib/auth.ts`. Cookie is `secure` + `sameSite: 'none'` (cross-site usage — the app is embedded; see the fixed origin allowlist in `next.config.ts`).
- **`proxy.ts` at the repo root is the Next.js middleware** (Next 16 renamed `middleware` → `proxy`). It redirects unauthenticated users to `/login` and authenticated users away from `/login` `/register`. It does **not** protect `/api/*` (excluded by the matcher).
- Every API route re-verifies the session itself. The common pattern is a local `requireSession()` helper that reads the cookie and calls `verifySession`, returning 401 on failure. `GET /api/livekit?room=<name>` mints a LiveKit `AccessToken` with `identity` = user id, `name` = username.

### Data model (`prisma/schema.prisma`)

`User` — `Friendship` (self-relation, `PENDING`/`ACCEPTED`, per-side `*LastReadAt` for DM unread tracking) — `Server` → `Channel` (`TEXT`/`VOICE`; `roomName` only meaningful for `VOICE`) → `Message`. `DirectMessage` is a direct user↔user relation (no channel). Tables are `@@map`-ed to snake_case. IDs are `cuid()`.

The schema supports multiple servers, but the UI is effectively single-server: `app/(app)/layout.tsx` always loads the first `Server` by `createdAt`.

### Server-side caching

`lib/serverData.ts` wraps channel reads in `unstable_cache` with tag-based invalidation (`serverChannelsTag(serverId)`, `channel:<id>`). Routes that mutate channels must `revalidateTag` the matching tag.

### Client state

`components/AppContext.tsx` (`useAppContext`, provided by `AppShell`) holds cross-cutting client state: voice connection, active participants, screen-share thumbnails/view state, DM unread set, friend id set, private-call state. Feature areas have their own React contexts (`FriendsContext`, `ParticipantAudioContext`).

## Conventions

- Path alias: `@/*` → repo root.
- UI: shadcn (`components/ui/`, style `base-nova`, `rsc: true`) + `@base-ui/react`, Tailwind v4 (config in `app/globals.css` via `@theme`, no `tailwind.config`), `lucide-react` icons, `cn()` from `lib/utils.ts`.
- Forms: `react-hook-form` + `zod` resolvers; schemas live in `lib/validation/`.
- API request bodies are validated with `zod` `safeParse`; return `{ error }` + status on failure, the first issue message as the error string.
- API responses to the client are hand-mapped to DTOs from `lib/types.ts` (e.g. `MessageDTO`, `FriendDTO`) — do not leak raw Prisma rows or password fields.
- Toasts: `notify` from `lib/toast.ts` (wraps `react-toastify`).
- Comments and user-facing strings are in Portuguese; keep that.
- Prisma-related skills are installed (`skills-lock.json`) — use them for schema/migration/client work.
