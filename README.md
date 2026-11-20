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

## Deploy (DigitalOcean App Platform)

The app is described by `.do/app.yaml`. App Platform builds the Dockerfile from `main` on every
push, runs `oft-api import-seed` before each deploy, and serves HTTPS for `ourfamilytree.net`.

1. Managed Postgres cluster `ourfamilytree`: create the database and user once:
   `doctl databases db create <cluster-id> oft` and `doctl databases user create <cluster-id> oft`.
   Then give the user the schema: connect as `doadmin` and run `ALTER DATABASE oft OWNER TO oft;`.
2. Google Cloud console: create an OAuth client of type "Web application" with the redirect URI
   `https://ourfamilytree.net/oauth/google/callback`.
3. `doctl apps create --spec .do/app.yaml`, then in the control panel (App → Settings → web →
   Environment variables) set `ADMIN_EMAILS`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. DNS: point `ourfamilytree.net` and `www` at the app as the control panel shows (App → Settings →
   Domains).
5. In Claude, signed in as an `ADMIN_EMAILS` address: Settings → Connectors → Add custom connector →
   `https://ourfamilytree.net/mcp`.

The database connection verifies the server certificate with the cluster CA (`DATABASE_CA_CERT`,
bound from `${db.CA_CERT}`).
