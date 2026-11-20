# Kent and Kint Records Map

The public site for the Kent and Kint Records Map (ourfamilytree.net), with research saved in
PostgreSQL and an MCP server through which the project administrators manage it from Claude.

## Run locally

```bash
cp .env.example .env        # ADMIN_EMAILS and DEV_LOGIN_EMAIL=dev@localhost: local sign-in skips Google
just db                     # Postgres on localhost:5442
just seed                   # map data and 883 records
just serve                  # http://localhost:8080
```

Connect an MCP client to `http://localhost:8080/mcp`. For example, in Claude Code:
`claude mcp add --transport http ourfamilytree http://localhost:8080/mcp`, then `/mcp` to sign in.

## Deploy (DigitalOcean)

1. Google Cloud console: create an OAuth client of type "Web application" with the redirect URI
   `https://ourfamilytree.net/oauth/google/callback`.
2. DigitalOcean Managed PostgreSQL: create a database and user, add the droplet to Trusted Sources,
   and download the CA certificate to `certs/ca-certificate.crt` on the droplet.
3. On the droplet, next to `compose.prod.yml` and `Caddyfile`, write `.env`:

   ```
   DATABASE_URL=postgres://USER:PASS@HOST:25060/DB?sslmode=verify-full&sslrootcert=/certs/ca-certificate.crt
   BASE_URL=https://ourfamilytree.net
   ADMIN_EMAILS=michelle@example.com,coadmin@example.com
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

4. `docker compose -f compose.prod.yml up -d`, then once:
   `docker compose -f compose.prod.yml run --rm app import-seed`.
5. In Claude (signed in as an `ADMIN_EMAILS` address): Settings → Connectors → Add custom connector → `https://ourfamilytree.net/mcp`.

Images are built by `.github/workflows/docker.yml` on pushes to `main` and on `v*` tags.
