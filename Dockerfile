# -- Build --
FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates/ crates/
# app.js and index.html are compiled into the binary (include_str!).
COPY frontend/ frontend/
RUN cargo build --release -p oft-api

# -- Runtime --
FROM alpine:3.21
RUN apk add --no-cache ca-certificates wget && adduser -S -u 10001 oft
COPY --from=build /app/target/release/oft-api /usr/local/bin/oft-api
# Seed data for `oft-api import-seed` (paths default to seed/...).
COPY seed/ /srv/seed/
WORKDIR /srv
ENV PORT=8080 RUST_LOG=oft_api=info,tower_http=warn
EXPOSE 8080
USER oft
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
ENTRYPOINT ["oft-api"]
CMD ["serve"]
