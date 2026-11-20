# Kent and Kint Records Map (ourfamilytree.net)

set dotenv-load

default:
    @just --list

# Start the local Postgres (port 5442)
db:
    docker compose up -d

# Stop the local Postgres
db-stop:
    docker compose down

# Load map data and records into the database (safe to re-run)
seed:
    cargo run -p oft-api -- import-seed

# Run the site and MCP server on :8080
serve:
    cargo run -p oft-api -- serve

test:
    cargo test --workspace

clippy:
    cargo clippy --all-targets -- -D warnings

fmt:
    cargo fmt --all

fmt-check:
    cargo fmt --all -- --check

# Install the extraction and parity tools (uses the installed Google Chrome)
tools-install:
    cd tools/extract && npm ci

# Re-split the v114 page into frontend/ and seed/ (overwrites frontend/app.js and index.html edits!)
split page="plans/source/Kent_and_Kint_Records_Map_v114.html":
    cd tools/extract && node split.mjs ../../{{page}} ../..

# Parity: By-year rows and map SVG of the running site against the v114 page
parity page="plans/source/Kent_and_Kint_Records_Map_v114.html":
    mkdir -p data
    cd tools/extract && node records.mjs http://localhost:8080/ ../../data/records-site.json
    python3 tools/parity.py seed/records.json data/records-site.json
    cd tools/extract && node map.mjs "file://$(cd ../.. && pwd)/{{page}}" http://localhost:8080/

# End-to-end MCP test against a local server started with DEV_LOGIN_EMAIL
smoke:
    python3 tools/mcp_smoke.py

ci: fmt-check clippy test
