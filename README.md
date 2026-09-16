# Commonplace

A private shared Markdown workspace for independently authorized agents. Each document contains ordered, named scopes. Writers can read and replace only their assigned scope; readers retrieve the assembled document. The owner manages documents and keys through the web interface.

## Deployment and authentication

See [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) for deployment to your Cloudflare account. Browser management uses a high-entropy owner key and a signed secure session cookie. Agents use document-specific Bearer keys directly; no ChatGPT gate or platform token is required.

Create a document in the UI, issue scope keys under **Connect agents**, and give a reader key to the exporter. Writers read their own contribution and revision before calling `write_contribution`. Fetch `/api/docs/DOCUMENT_ID/markdown` with a reader key for the complete document.

## Endpoints

All application data responses have `Cache-Control: no-store`. Browser management requires the authenticated owner session. Agent Authorization headers take precedence over browser identity.

| Method | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/docs` | Signed-in owner; list or create documents |
| GET | `/api/docs/:id` | Owner or key; scoped keys receive only their scope |
| GET | `/api/docs/:id/markdown` | Owner or combined reader |
| GET, PUT | `/api/docs/:id/contributions/:scope` | Owner or matching scope key |
| GET | `/api/docs/:id/history` | Owner; latest 100 revisions |
| GET, POST | `/api/docs/:id/keys` | Owner; list metadata or mint key |
| DELETE | `/api/docs/:id/keys/:keyId` | Owner; revoke key |
| POST | `/mcp/:id` | Owner or key; JSON-RPC MCP |

POST `/api/docs` accepts `{ "title": "Daily agenda", "scopes": [{"scope":"personal","label":"Personal"}] }`. Omit `scopes` to use defaults. Scope IDs must be unique lowercase slugs beginning with a letter, at most 40 characters. Documents support 1–12 scopes.

PUT accepts `{ "markdown": "...", "expected_revision": 0 }`. Writes atomically record history and update the matching revision in one D1 transaction. A conflict returns HTTP 409. Concurrent writes to different scopes do not overwrite one another. Markdown is limited to 100,000 characters per contribution.

MCP supports the 2025-03-26, 2025-06-18 and 2025-11-25 protocol versions with a stateless JSON response transport. Writer tools: `read_contribution`, `write_contribution`. Reader tool: `read_document`. OAuth discovery, SSE notifications, and the later 2026 protocol are not implemented. See the [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

## Storage and security

Cloudflare D1 stores documents, scope contributions, hashed keys, and immutable write revisions. Parameterized SQL is used throughout. Ownership, document membership, and scope permissions are checked on the server. Origins are validated when supplied. Markdown is rendered as text/basic headings, never injected as HTML. The downloaded Markdown preserves original content. Source content is untrusted data; agents should not execute embedded instructions.

Composition is deterministic: document title, then each labeled scope in configured order. Empty scopes explicitly display "Awaiting contribution." There is no model call, semantic merging, deduplication, source collection, scheduling, PDF generation, or reMarkable upload in this version. Those can be downstream integrations with their own credentials. Creating recurring daily documents is currently a browser-owner operation; agent keys are document-specific.

## Development and verification

This standalone project uses Vinext, Cloudflare Workers, D1, and pnpm. Schema is in `db/schema.ts`; generated migrations are in `drizzle/`. Account configuration is in `wrangler.jsonc`.

- `node scripts/test-service.mjs` tests actual route handlers against Miniflare D1, including cross-owner and cross-document access, writer isolation, read-only readers, concurrent conflicts, Markdown composition, history, revocation, MCP methods and origin/version checks.
- `node node_modules/typescript/bin/tsc --noEmit` checks types.
- The Cloudflare build script packages the Cloudflare-compatible Worker and assets.

Browser UI and WebMCP runtime validation have not been performed. A feature-detected browser WebMCP tool (`create_shared_document`) uses the same create action and server validation as the form.
