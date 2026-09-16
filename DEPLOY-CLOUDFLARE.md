# Deploy Reportback to your Cloudflare account

This is the standalone Cloudflare version. It does not require ChatGPT hosting, sign-in, or a platform bypass token. The original hosted copy is not changed by these files.

## Current migration status

- Cloudflare-compatible source, owner authentication, D1 schema, deployment scripts, and MCP endpoints prepared.
- The original database contained zero documents when checked on September 16, 2026. No content export was needed at that time. If you add documents before migration, recheck/export before switching.
- No Cloudflare account is configured in this package. Nothing has been deployed to your account yet.
- The D1 database ID in `wrangler.jsonc` is a deliberate placeholder. The deployment script refuses to publish until a real account and database are configured.

## 1. Install and authenticate

Requires Node 22.13+ and pnpm matching `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm exec wrangler whoami
```

Use the account ID from your intended Cloudflare account. For CI, supply a scoped `CLOUDFLARE_API_TOKEN` with the needed Workers Scripts and D1 permissions through your CI secret store; do not commit credentials. The interactive login is preferable for a first local setup.

## 2. Create the database and configure the app

```bash
pnpm exec wrangler d1 create reportback
node scripts/configure-cloudflare.mjs YOUR_ACCOUNT_ID YOUR_D1_DATABASE_ID
```

If you have multiple accounts, select the correct account when prompted or set `CLOUDFLARE_ACCOUNT_ID` in your environment. The setup script writes the returned IDs to `wrangler.jsonc`; these resource IDs are not credentials.

The optional third argument selects a Worker name; default is `reportback`. Confirm that this name does not refer to an unrelated existing Worker before deploying.

## 3. Verify and deploy

```bash
pnpm run typecheck
pnpm run test:service
pnpm run deploy
node scripts/set-owner-key.mjs
```

Deployment builds the Worker, applies the versioned D1 migrations, and publishes the app. `set-owner-key.mjs` generates a 256-bit random owner key, retains it in the ignored local `.owner-key.txt` file, and uploads it as the `OWNER_SECRET` Worker secret. Retrying the script reuses the same key. Store it in your password manager, then remove the local file if desired.

Do not replace OWNER_SECRET with a human password. It must be 64 hexadecimal characters produced from 32 random bytes. The application requires this format and does not use a password-hardening function because the credential is high-entropy random material.

The new `workers.dev` URL appears in Wrangler's deployment output. Open it, sign in using the owner key, create a document, and issue separate scope keys under **Connect agents**. A custom domain can be added after deployment.

## Authentication

- **Browser owner:** an owner key exchanged for an HMAC-signed, origin-bound, 24-hour `Secure`, `HttpOnly`, `SameSite=Strict` cookie.
- **Agent writer:** `Authorization: Bearer SCOPE_KEY`. Can read/write only its own contribution in one document.
- **Combined reader:** `Authorization: Bearer READER_KEY`. Can read the combined document, cannot write.
- No `OAI-Sites-Authorization` header is required.
- Untrusted `oai-authenticated-user-*` headers are ignored; they cannot grant owner access.
- Owner credentials fail closed if the Worker secret is missing. The sign-in shell is publicly reachable; document contents are authenticated.

Rotating OWNER_SECRET invalidates every browser session. It does not change agent keys. Revoking an agent key happens through the workspace.

## MCP and REST

The workspace generates per-document connection configurations. Example:

```json
{
  "mcpServers": {
    "reportback": {
      "type": "http",
      "url": "https://YOUR_WORKER_URL/mcp/DOCUMENT_ID",
      "headers": {"Authorization": "Bearer YOUR_SCOPE_KEY"}
    }
  }
}
```

Reader URL: `https://YOUR_WORKER_URL/api/docs/DOCUMENT_ID/markdown`, authenticated with a reader key. MCP supports the 2025-03-26, 2025-06-18, and 2025-11-25 versions, with JSON responses over Streamable HTTP.

## Cutover

Keep the original site available until the Cloudflare URL, owner sign-in, and agent read/write have been verified. Update each agent's URL and keys. If the old site acquired data after the empty-database check, transfer documents, contributions, and revision history first, remap document ownership to the standalone OWNER_ID, and reissue keys. Do not copy an old Sites owner identity into unauthenticated HTTP headers.

No data migration is performed automatically by these scripts. Do not delete the original site until cutover has been confirmed.

## Sources

- [Cloudflare Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/)
