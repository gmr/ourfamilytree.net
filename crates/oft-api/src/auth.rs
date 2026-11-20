//! OAuth 2.1 authorization server for the MCP endpoint, per the MCP authorization spec:
//! protected-resource and authorization-server metadata, dynamic client registration, PKCE (S256)
//! and refresh-token rotation. Identity comes from Google sign-in; only active `app_user` emails
//! get a token. Codes and tokens are random 256-bit values, stored as SHA-256 hashes.

use std::time::{Duration, Instant};

use axum::{
    Form, Json,
    extract::{Query, Request, State},
    http::{HeaderValue, StatusCode, header},
    middleware::Next,
    response::{Html, IntoResponse, Redirect, Response},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::RngCore;
use reqwest::Url;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::AppState;

const ACCESS_TTL: i64 = 3600;
const REFRESH_TTL: i64 = 30 * 24 * 3600;
const GOOGLE_AUTH: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO: &str = "https://openidconnect.googleapis.com/v1/userinfo";

/// The signed-in administrator, put in the request extensions for the MCP tools.
#[derive(Clone, Debug)]
pub struct AuthUser(pub oft_db::User);

fn random_token() -> String {
    let mut b = [0u8; 32];
    rand::rng().fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}

pub fn hash(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}

fn oauth_error(status: StatusCode, error: &str, description: &str) -> Response {
    (
        status,
        Json(json!({"error": error, "error_description": description})),
    )
        .into_response()
}

/// ponytail: one global counter for the sign-in endpoints (PRD §9 rate limit); per-IP buckets if
/// abuse ever shows up. 120 requests a minute is far above what a few administrators need.
pub async fn rate_limit(State(st): State<AppState>, req: Request, next: Next) -> Response {
    {
        let mut w = st.auth_window.lock().await;
        if w.0.elapsed() > Duration::from_secs(60) {
            *w = (Instant::now(), 0);
        }
        w.1 += 1;
        if w.1 > 120 {
            return oauth_error(
                StatusCode::TOO_MANY_REQUESTS,
                "slow_down",
                "too many sign-in requests; try again in a minute",
            );
        }
    }
    next.run(req).await
}

pub async fn protected_resource(State(st): State<AppState>) -> Json<Value> {
    Json(json!({
        "resource": format!("{}/mcp", st.base_url),
        "authorization_servers": [st.base_url],
        "bearer_methods_supported": ["header"],
        "scopes_supported": ["mcp"],
    }))
}

pub async fn authorization_server(State(st): State<AppState>) -> Json<Value> {
    let b = &st.base_url;
    Json(json!({
        "issuer": b,
        "authorization_endpoint": format!("{b}/authorize"),
        "token_endpoint": format!("{b}/token"),
        "registration_endpoint": format!("{b}/register"),
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
        "scopes_supported": ["mcp"],
    }))
}

#[derive(Deserialize)]
pub struct RegisterReq {
    #[serde(default)]
    redirect_uris: Vec<String>,
    #[serde(default)]
    client_name: String,
}

/// A redirect URI must be https, or http on the local machine (desktop and CLI clients).
fn redirect_ok(u: &str) -> bool {
    Url::parse(u).is_ok_and(|u| {
        u.fragment().is_none()
            && match u.scheme() {
                "https" => true,
                "http" => matches!(u.host_str(), Some("localhost" | "127.0.0.1" | "[::1]")),
                _ => false,
            }
    })
}

pub async fn register(State(st): State<AppState>, Json(r): Json<RegisterReq>) -> Response {
    if r.redirect_uris.is_empty()
        || r.redirect_uris.len() > 10
        || !r.redirect_uris.iter().all(|u| redirect_ok(u))
    {
        return oauth_error(
            StatusCode::BAD_REQUEST,
            "invalid_redirect_uri",
            "redirect_uris must be https, or http on localhost",
        );
    }
    let id = random_token();
    let name: String = r.client_name.chars().take(200).collect();
    let mut c = match st.pool.acquire().await {
        Ok(c) => c,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    if oft_db::oauth_register_client(&mut c, &id, &name, &r.redirect_uris)
        .await
        .is_err()
    {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    (
        StatusCode::CREATED,
        Json(json!({
            "client_id": id,
            "client_id_issued_at": chrono::Utc::now().timestamp(),
            "client_name": name,
            "redirect_uris": r.redirect_uris,
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
        })),
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct AuthorizeReq {
    response_type: String,
    client_id: String,
    redirect_uri: String,
    code_challenge: String,
    #[serde(default)]
    code_challenge_method: String,
    state: Option<String>,
}

fn page(status: StatusCode, msg: &str) -> Response {
    let body = format!(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Sign in</title>\
         <body style='font:16px system-ui;max-width:36em;margin:3em auto;padding:0 16px'><h1>Kent and Kint Records Map</h1><p>{}</p>",
        msg.replace('&', "&amp;").replace('<', "&lt;")
    );
    (status, Html(body)).into_response()
}

pub async fn authorize(State(st): State<AppState>, Query(q): Query<AuthorizeReq>) -> Response {
    let mut c = match st.pool.acquire().await {
        Ok(c) => c,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    let redirects = oft_db::oauth_client_redirects(&mut c, &q.client_id)
        .await
        .ok()
        .flatten();
    // Never redirect to an unregistered URI: show the error here instead.
    if !redirects.is_some_and(|r| r.contains(&q.redirect_uri)) {
        return page(
            StatusCode::BAD_REQUEST,
            "Unknown client or redirect address. Remove the connector and add it again.",
        );
    }
    if q.response_type != "code" || q.code_challenge_method != "S256" || q.code_challenge.len() < 43
    {
        return redirect_error(&q.redirect_uri, "invalid_request", q.state.as_deref());
    }
    let req = oft_db::OAuthRequest {
        client_id: q.client_id,
        redirect_uri: q.redirect_uri,
        code_challenge: q.code_challenge,
        client_state: q.state,
        user_id: None,
    };
    // Local development only (refused at start-up unless the base URL is localhost).
    if let Some(email) = &st.dev_login_email {
        return consent(&st, &mut c, req, email).await;
    }
    let Some(g) = &st.google else {
        return page(
            StatusCode::SERVICE_UNAVAILABLE,
            "Sign-in is not configured on this server.",
        );
    };
    let rid = random_token();
    if oft_db::oauth_save_request(&mut c, &hash(&rid), &req)
        .await
        .is_err()
    {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    let url = Url::parse_with_params(
        GOOGLE_AUTH,
        &[
            ("client_id", g.client_id.as_str()),
            (
                "redirect_uri",
                &format!("{}/oauth/google/callback", st.base_url),
            ),
            ("response_type", "code"),
            ("scope", "openid email"),
            ("state", &rid),
            ("prompt", "select_account"),
        ],
    )
    .expect("static url");
    Redirect::to(url.as_str()).into_response()
}

fn redirect_error(redirect_uri: &str, error: &str, state: Option<&str>) -> Response {
    let mut u = Url::parse(redirect_uri).expect("registered uri parses");
    u.query_pairs_mut().append_pair("error", error);
    if let Some(s) = state {
        u.query_pairs_mut().append_pair("state", s);
    }
    Redirect::to(u.as_str()).into_response()
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// After sign-in, asks the administrator to approve this client by name and return address,
/// so a link from someone else's registered client cannot silently mint tokens. The form's
/// one-time id (stored hashed, 10 minutes) is the CSRF token.
async fn consent(
    st: &AppState,
    c: &mut oft_db::sqlx::PgConnection,
    mut req: oft_db::OAuthRequest,
    email: &str,
) -> Response {
    // ADMIN_EMAILS is the only list of who may sign in; app_user just records them for the audit log.
    if !st.admin_emails.contains(&email.to_lowercase()) {
        tracing::warn!(email, "sign-in refused: not in ADMIN_EMAILS");
        return page(
            StatusCode::FORBIDDEN,
            &format!("{email} is not on the list of administrators for this site."),
        );
    }
    let user = match oft_db::upsert_user(c, email, "", "admin", true).await {
        Ok(u) => u,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    let name = oft_db::oauth_client_name(c, &req.client_id)
        .await
        .ok()
        .flatten()
        .unwrap_or_default();
    req.user_id = Some(user.id);
    let id = random_token();
    if oft_db::oauth_save_request(c, &hash(&id), &req)
        .await
        .is_err()
    {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    let dest = Url::parse(&req.redirect_uri)
        .ok()
        .and_then(|u| u.host_str().map(str::to_string))
        .unwrap_or_default();
    let body = format!(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Allow access</title>\
         <body style='font:16px system-ui;max-width:36em;margin:3em auto;padding:0 16px;color:#0f172a'>\
         <h1 style='font-size:22px'>Kent and Kint Records Map</h1>\
         <p>Signed in as <b>{email}</b>.</p>\
         <p>The application <b>{name}</b> asks to read and change research on this site, and will receive access at \
         <b>{dest}</b>.</p><p>Allow it only if you started this from Claude just now.</p>\
         <form method=post action='/authorize/consent'><input type=hidden name=id value='{id}'>\
         <button name=decision value=allow style='font:600 15px system-ui;padding:10px 18px;border:0;border-radius:8px;background:#b91c1c;color:#fff'>Allow</button> \
         <button name=decision value=deny style='font:600 15px system-ui;padding:10px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff'>Deny</button></form>",
        email = esc(&user.email),
        name = esc(if name.is_empty() {
            "(unnamed application)"
        } else {
            &name
        }),
        dest = esc(&dest),
    );
    let mut r = Html(body).into_response();
    r.headers_mut().insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("frame-ancestors 'none'"),
    );
    r.headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    r
}

#[derive(Deserialize)]
pub struct ConsentForm {
    id: String,
    decision: String,
}

/// Issues the authorization code after the administrator approves.
pub async fn consent_post(State(st): State<AppState>, Form(f): Form<ConsentForm>) -> Response {
    let mut c = match st.pool.acquire().await {
        Ok(c) => c,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    let Some(req) = oft_db::oauth_take_request(&mut c, &hash(&f.id))
        .await
        .ok()
        .flatten()
    else {
        return page(
            StatusCode::BAD_REQUEST,
            "This approval has expired. Start again from Claude.",
        );
    };
    let Some(user) = req.user_id else {
        return page(
            StatusCode::BAD_REQUEST,
            "This approval is not valid. Start again from Claude.",
        );
    };
    if f.decision != "allow" {
        return redirect_error(
            &req.redirect_uri,
            "access_denied",
            req.client_state.as_deref(),
        );
    }
    let code = random_token();
    if oft_db::oauth_save_code(&mut c, &hash(&code), user, &req)
        .await
        .is_err()
    {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    tracing::info!(%user, client = %req.client_id, "MCP access approved");
    let mut u = Url::parse(&req.redirect_uri).expect("registered uri parses");
    u.query_pairs_mut().append_pair("code", &code);
    if let Some(s) = &req.client_state {
        u.query_pairs_mut().append_pair("state", s);
    }
    Redirect::to(u.as_str()).into_response()
}

#[derive(Deserialize)]
pub struct GoogleCallback {
    code: Option<String>,
    state: String,
    error: Option<String>,
}

pub async fn google_callback(
    State(st): State<AppState>,
    Query(q): Query<GoogleCallback>,
) -> Response {
    let mut c = match st.pool.acquire().await {
        Ok(c) => c,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    let Some(req) = oft_db::oauth_take_request(&mut c, &hash(&q.state))
        .await
        .ok()
        .flatten()
        .filter(|r| r.user_id.is_none())
    else {
        return page(
            StatusCode::BAD_REQUEST,
            "This sign-in link has expired. Start again from Claude.",
        );
    };
    let (Some(code), None, Some(g)) = (q.code, q.error, &st.google) else {
        return redirect_error(
            &req.redirect_uri,
            "access_denied",
            req.client_state.as_deref(),
        );
    };
    let email = match google_email(&st, g, &code).await {
        Ok(e) => e,
        Err(e) => {
            tracing::warn!("Google sign-in failed: {e}");
            return page(StatusCode::BAD_GATEWAY, "Google sign-in failed. Try again.");
        }
    };
    consent(&st, &mut c, req, &email).await
}

async fn google_email(
    st: &AppState,
    g: &crate::Google,
    code: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let tok: Value = st
        .http
        .post(GOOGLE_TOKEN)
        .form(&[
            ("code", code),
            ("client_id", &g.client_id),
            ("client_secret", &g.client_secret),
            (
                "redirect_uri",
                &format!("{}/oauth/google/callback", st.base_url),
            ),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let access = tok["access_token"]
        .as_str()
        .ok_or("no access_token from Google")?;
    let info: Value = st
        .http
        .get(GOOGLE_USERINFO)
        .bearer_auth(access)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    if info["email_verified"] != json!(true) {
        return Err("Google email is not verified".into());
    }
    Ok(info["email"]
        .as_str()
        .ok_or("no email from Google")?
        .to_lowercase())
}

#[derive(Deserialize)]
pub struct TokenReq {
    grant_type: String,
    code: Option<String>,
    redirect_uri: Option<String>,
    client_id: Option<String>,
    code_verifier: Option<String>,
    refresh_token: Option<String>,
}

pub async fn token(State(st): State<AppState>, Form(t): Form<TokenReq>) -> Response {
    let mut c = match st.pool.acquire().await {
        Ok(c) => c,
        Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
    };
    let (client, user) = match t.grant_type.as_str() {
        "authorization_code" => {
            let (Some(code), Some(verifier)) = (t.code, t.code_verifier) else {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "code and code_verifier are required",
                );
            };
            let Some(row) = oft_db::oauth_take_code(&mut c, &hash(&code))
                .await
                .ok()
                .flatten()
            else {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_grant",
                    "unknown or expired code",
                );
            };
            let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
            if challenge != row.code_challenge
                || t.client_id.as_deref() != Some(row.client_id.as_str())
                || t.redirect_uri
                    .as_deref()
                    .is_some_and(|u| u != row.redirect_uri)
            {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_grant",
                    "PKCE, client or redirect mismatch",
                );
            }
            (row.client_id, row.user_id)
        }
        "refresh_token" => {
            let Some(rt) = t.refresh_token else {
                return oauth_error(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "refresh_token is required",
                );
            };
            // Only the client the token was issued to can use (and so consume) it.
            match oft_db::oauth_take_refresh(
                &mut c,
                &hash(&rt),
                t.client_id.as_deref().unwrap_or_default(),
            )
            .await
            .ok()
            .flatten()
            {
                Some(found) => found,
                _ => {
                    return oauth_error(
                        StatusCode::BAD_REQUEST,
                        "invalid_grant",
                        "unknown or expired refresh token",
                    );
                }
            }
        }
        _ => {
            return oauth_error(
                StatusCode::BAD_REQUEST,
                "unsupported_grant_type",
                "use authorization_code or refresh_token",
            );
        }
    };
    let (access, refresh) = (random_token(), random_token());
    let saved = async {
        oft_db::oauth_save_token(&mut c, &hash(&access), "access", &client, user, ACCESS_TTL)
            .await?;
        oft_db::oauth_save_token(
            &mut c,
            &hash(&refresh),
            "refresh",
            &client,
            user,
            REFRESH_TTL,
        )
        .await
    }
    .await;
    if saved.is_err() {
        return StatusCode::SERVICE_UNAVAILABLE.into_response();
    }
    (
        [(header::CACHE_CONTROL, "no-store")],
        Json(json!({"access_token": access, "token_type": "Bearer", "expires_in": ACCESS_TTL, "refresh_token": refresh, "scope": "mcp"})),
    )
        .into_response()
}

/// Requires a valid access token on /mcp; on failure points the client at the metadata (RFC 9728).
pub async fn require_bearer(State(st): State<AppState>, mut req: Request, next: Next) -> Response {
    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(str::to_string);
    let user = match token {
        Some(t) => match st.pool.acquire().await {
            // Removing an email from ADMIN_EMAILS (and restarting) ends its access at once.
            Ok(mut c) => oft_db::oauth_token_user(&mut c, &hash(&t))
                .await
                .ok()
                .flatten()
                .filter(|u| st.admin_emails.contains(&u.email)),
            Err(_) => return StatusCode::SERVICE_UNAVAILABLE.into_response(),
        },
        None => None,
    };
    let Some(user) = user else {
        let mut r = StatusCode::UNAUTHORIZED.into_response();
        let v = format!(
            "Bearer resource_metadata=\"{}/.well-known/oauth-protected-resource\"",
            st.base_url
        );
        r.headers_mut().insert(
            header::WWW_AUTHENTICATE,
            HeaderValue::from_str(&v).expect("ascii"),
        );
        return r;
    };
    req.extensions_mut().insert(AuthUser(user));
    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redirect_rules() {
        assert!(redirect_ok("https://claude.ai/api/mcp/auth_callback"));
        assert!(redirect_ok("http://localhost:33418/callback"));
        assert!(redirect_ok("http://127.0.0.1:5000/cb"));
        assert!(!redirect_ok("http://evil.example/cb"));
        assert!(!redirect_ok("javascript:alert(1)"));
        assert!(!redirect_ok("https://x.example/cb#frag"));
    }

    #[test]
    fn pkce_s256_matches_rfc7636_example() {
        let v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(
            URL_SAFE_NO_PAD.encode(Sha256::digest(v.as_bytes())),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }
}
