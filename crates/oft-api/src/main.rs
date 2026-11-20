use std::{net::SocketAddr, path::PathBuf, sync::Arc, time::Instant};

use axum::{
    Router, middleware,
    routing::{get, post},
};
use clap::{Parser, Subcommand};
use oft_db::sqlx::PgPool;
use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};
use serde_json::Value;
use tokio::sync::{Mutex, RwLock};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod jobs;
mod mcp;
mod ops;
mod site;

#[derive(Parser)]
#[command(
    name = "oft-api",
    about = "Kent and Kint Records Map: site, MCP server and admin commands"
)]
struct Cli {
    /// PostgreSQL URL, for example postgres://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=ca.crt
    #[arg(long, env = "DATABASE_URL", global = true, hide_env_values = true)]
    database_url: Option<String>,
    #[command(subcommand)]
    command: Option<Cmd>,
}

#[derive(Subcommand)]
enum Cmd {
    /// Run the web server and MCP endpoint (default).
    Serve,
    /// Load the map data and records extracted by tools/extract (safe to re-run: record ids are kept).
    ImportSeed {
        #[arg(long, default_value = "seed/datasets.json")]
        datasets: PathBuf,
        #[arg(long, default_value = "seed/records.json")]
        records: PathBuf,
    },
    /// Import a research JSON file (v1 from the old page, or v2).
    ImportResearch {
        #[arg(long)]
        file: PathBuf,
        /// Delete all research first (a backup is taken).
        #[arg(long)]
        replace: bool,
        /// Report only.
        #[arg(long)]
        dry_run: bool,
    },
    /// Add or update an administrator (allowed to sign in to the MCP server).
    UserAdd {
        #[arg(long)]
        email: String,
        #[arg(long, default_value = "")]
        name: String,
        /// admin or co_admin
        #[arg(long, default_value = "co_admin")]
        role: String,
    },
    /// Stop an administrator signing in (existing tokens stop working at once).
    UserDisable {
        #[arg(long)]
        email: String,
    },
    UserList,
    /// Take a manual research backup now.
    Backup,
}

#[derive(Clone)]
pub struct Google {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    /// Public origin, no trailing slash, e.g. https://ourfamilytree.net
    pub base_url: String,
    pub google: Option<Google>,
    /// Development only: sign every MCP login in as this email, without Google.
    pub dev_login_email: Option<String>,
    pub http: reqwest::Client,
    /// (etag, body) of the public data.js; None until built or after research changes.
    pub data_js: Arc<RwLock<Option<site::Cached>>>,
    pub auth_window: Arc<Mutex<(Instant, u32)>>,
}

impl AppState {
    /// Research changed: rebuild data.js on the next request.
    pub async fn invalidate(&self) {
        *self.data_js.write().await = None;
    }
}

type Error = Box<dyn std::error::Error + Send + Sync>;

#[tokio::main]
async fn main() -> Result<(), Error> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "oft_api=info,tower_http=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
    let cli = Cli::parse();
    let url = cli.database_url.ok_or("DATABASE_URL is not set")?;
    let pool = oft_db::connect(&url).await?;
    match cli.command.unwrap_or(Cmd::Serve) {
        Cmd::Serve => serve(pool).await,
        Cmd::ImportSeed { datasets, records } => import_seed(&pool, &datasets, &records).await,
        Cmd::ImportResearch {
            file,
            replace,
            dry_run,
        } => {
            let v: Value = serde_json::from_slice(&std::fs::read(file)?)?;
            let rep = ops::import(&pool, v, replace, dry_run, None).await?;
            println!("{}", serde_json::to_string_pretty(&rep)?);
            Ok(())
        }
        Cmd::UserAdd { email, name, role } => {
            if !matches!(role.as_str(), "admin" | "co_admin") || !email.contains('@') {
                return Err("role must be admin or co_admin, and email must be an address".into());
            }
            let u = oft_db::upsert_user(&mut *pool.acquire().await?, &email, &name, &role, true)
                .await?;
            println!("{} ({}) can sign in", u.email, u.role);
            Ok(())
        }
        Cmd::UserDisable { email } => {
            let mut c = pool.acquire().await?;
            let u = oft_db::active_user_by_email(&mut c, &email)
                .await?
                .ok_or("no active user with that email")?;
            oft_db::upsert_user(&mut c, &u.email, "", &u.role, false).await?;
            println!("{} disabled", u.email);
            Ok(())
        }
        Cmd::UserList => {
            for u in oft_db::users(&mut *pool.acquire().await?).await? {
                println!(
                    "{}\t{}\t{}\t{}",
                    u.email,
                    u.role,
                    if u.active { "active" } else { "disabled" },
                    u.display_name
                );
            }
            Ok(())
        }
        Cmd::Backup => {
            let id = ops::backup(&mut *pool.acquire().await?, "manual", None).await?;
            println!("backup {id}");
            Ok(())
        }
    }
}

async fn serve(pool: PgPool) -> Result<(), Error> {
    let base_url = std::env::var("BASE_URL")
        .unwrap_or_else(|_| "http://localhost:8080".into())
        .trim_end_matches('/')
        .to_string();
    let host = reqwest::Url::parse(&base_url)?
        .host_str()
        .ok_or("BASE_URL has no host")?
        .to_string();
    let local = matches!(host.as_str(), "localhost" | "127.0.0.1");
    let dev_login_email = std::env::var("DEV_LOGIN_EMAIL")
        .ok()
        .filter(|s| !s.is_empty());
    if dev_login_email.is_some() && !local {
        return Err(
            "DEV_LOGIN_EMAIL skips sign-in and is allowed only when BASE_URL is localhost".into(),
        );
    }
    let google = match (
        std::env::var("GOOGLE_CLIENT_ID"),
        std::env::var("GOOGLE_CLIENT_SECRET"),
    ) {
        (Ok(client_id), Ok(client_secret)) if !client_id.is_empty() => Some(Google {
            client_id,
            client_secret,
        }),
        _ => None,
    };
    if google.is_none() && dev_login_email.is_none() {
        tracing::warn!("GOOGLE_CLIENT_ID/SECRET not set: nobody can sign in to the MCP server");
    }
    let st = AppState {
        pool,
        base_url: base_url.clone(),
        google,
        dev_login_email,
        http: reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()?,
        data_js: Default::default(),
        auth_window: Arc::new(Mutex::new((Instant::now(), 0))),
    };

    let mcp_state = st.clone();
    let mcp_service: StreamableHttpService<mcp::Mcp, LocalSessionManager> =
        StreamableHttpService::new(
            move || Ok(mcp::Mcp::new(mcp_state.clone())),
            Default::default(),
            StreamableHttpServerConfig::default()
                .with_allowed_hosts([host.clone(), format!("{host}:{}", port())]),
        );

    let oauth = Router::new()
        .route("/register", post(auth::register))
        .route("/authorize", get(auth::authorize))
        .route("/token", post(auth::token))
        .route("/oauth/google/callback", get(auth::google_callback))
        .layer(middleware::from_fn_with_state(st.clone(), auth::rate_limit));

    let app = Router::new()
        .route("/", get(site::index))
        .route("/index.html", get(site::index))
        .route("/app.js", get(site::app_js))
        .route("/data.js", get(site::data_js))
        .route("/health", get(site::health))
        .route(
            "/.well-known/oauth-protected-resource",
            get(auth::protected_resource),
        )
        .route(
            "/.well-known/oauth-protected-resource/mcp",
            get(auth::protected_resource),
        )
        .route(
            "/.well-known/oauth-authorization-server",
            get(auth::authorization_server),
        )
        .merge(oauth)
        .nest_service(
            "/mcp",
            tower::ServiceBuilder::new()
                .layer(middleware::from_fn_with_state(
                    st.clone(),
                    auth::require_bearer,
                ))
                .service(mcp_service),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(st.clone());

    tokio::spawn(jobs::nightly(st.pool.clone()));

    let addr = SocketAddr::from(([0, 0, 0, 0], port()));
    tracing::info!("listening on {addr}, public URL {base_url}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

fn port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080)
}

async fn shutdown() {
    let _ = tokio::signal::ctrl_c().await;
}

/// Loads seed/datasets.json and seed/records.json (written by tools/extract).
async fn import_seed(pool: &PgPool, datasets: &PathBuf, records: &PathBuf) -> Result<(), Error> {
    #[derive(serde::Deserialize)]
    struct Ds {
        name: String,
        value: Value,
    }
    #[derive(serde::Deserialize)]
    struct Rec {
        id: String,
        y: String,
        t: String,
        c: String,
        d: String,
        p: String,
        mk: Vec<String>,
        year: Option<String>,
        sections: Vec<String>,
    }
    #[derive(serde::Deserialize)]
    struct RecFile {
        errors: Vec<String>,
        records: Vec<Rec>,
    }
    let sets: Vec<Ds> = serde_json::from_slice(&std::fs::read(datasets)?)?;
    let rf: RecFile = serde_json::from_slice(&std::fs::read(records)?)?;
    if !rf.errors.is_empty() {
        return Err(format!("the records file lists page errors: {:?}", rf.errors).into());
    }
    let rows: Vec<oft_db::Record> = rf
        .records
        .into_iter()
        .map(|r| oft_db::Record {
            id: uuid::Uuid::nil(),
            legacy_hash: r.id,
            year_text: r.y,
            year: r.year.and_then(|y| y.parse().ok()),
            type_label: r.t,
            citation: r.c,
            details: r.d,
            place: r.p,
            marker_keys: r.mk,
            sections: r.sections,
            status: "active".into(),
        })
        .collect();
    let mut tx = pool.begin().await?;
    let pairs: Vec<(String, Value)> = sets.into_iter().map(|d| (d.name, d.value)).collect();
    oft_db::replace_datasets(&mut tx, &pairs).await?;
    let (inserted, removed) = oft_db::sync_records(&mut tx, &rows).await?;
    tx.commit().await?;
    println!(
        "{} datasets; {} records ({} new, {} marked removed)",
        pairs.len(),
        rows.len(),
        inserted,
        removed
    );
    Ok(())
}
