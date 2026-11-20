//! The public site: the v114 page split into index.html + app.js, and data.js built from the
//! database. No write routes exist here; all writes go through MCP.

use std::sync::Arc;

use axum::{
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{Html, IntoResponse, Response},
};
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::AppState;

pub type Cached = (Arc<str>, Arc<str>);

pub const INDEX_HTML: &str = include_str!("../../../frontend/index.html");
pub const APP_JS: &str = include_str!("../../../frontend/app.js");
const SCRIPTS: &str = "<script src=\"data.js\"></script>\n<script src=\"app.js\"></script>";

/// data.js for visitors: all datasets and the published research. Cached until research changes.
pub async fn data_js(State(st): State<AppState>, headers: HeaderMap) -> Response {
    let cached = st.data_js.read().await.clone();
    let (etag, body) = match cached {
        Some(c) => c,
        None => match build_public_data_js(&st).await {
            Ok(c) => {
                *st.data_js.write().await = Some(c.clone());
                c
            }
            Err(e) => {
                tracing::error!("data.js: {e}");
                return StatusCode::SERVICE_UNAVAILABLE.into_response();
            }
        },
    };
    if headers
        .get(header::IF_NONE_MATCH)
        .is_some_and(|v| v.as_bytes() == etag.as_bytes())
    {
        return StatusCode::NOT_MODIFIED.into_response();
    }
    (
        [
            (
                header::CONTENT_TYPE,
                HeaderValue::from_static("text/javascript; charset=utf-8"),
            ),
            (header::CACHE_CONTROL, HeaderValue::from_static("no-cache")),
            (
                header::ETAG,
                HeaderValue::from_str(&etag).expect("etag is ascii"),
            ),
        ],
        body.to_string(),
    )
        .into_response()
}

async fn build_public_data_js(st: &AppState) -> Result<Cached, oft_db::sqlx::Error> {
    let mut c = st.pool.acquire().await?;
    let sets = oft_db::datasets(&mut c).await?;
    let research = oft_db::research(&mut c).await?.published().to_page();
    let body = oft_domain::render_data_js(&sets, &research, "");
    let etag = format!("\"{:x}\"", Sha256::digest(body.as_bytes()));
    Ok((etag.into(), body.into()))
}

pub async fn index() -> Html<&'static str> {
    Html(INDEX_HTML)
}

pub async fn app_js() -> impl IntoResponse {
    (
        [
            (header::CONTENT_TYPE, "text/javascript; charset=utf-8"),
            (header::CACHE_CONTROL, "no-cache"),
        ],
        APP_JS,
    )
}

pub async fn health(State(st): State<AppState>) -> StatusCode {
    match oft_db::sqlx::query("SELECT 1").execute(&st.pool).await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

/// One self-contained page for the MCP App preview: data and code inline (the host's sandbox
/// cannot fetch from this site). Research arrives from the host in the tool result, so this page
/// starts with none, and the bridge hands it to the page's research code.
pub async fn preview_html(st: &AppState) -> Result<String, oft_db::sqlx::Error> {
    let mut c = st.pool.acquire().await?;
    let sets = oft_db::datasets(&mut c).await?;
    let data = oft_domain::render_data_js(
        &sets,
        &json!({"version": 1, "profiles": [], "familyGroups": []}),
        "",
    );
    let inline = format!(
        "<script>{data}</script>\n<script>{APP_JS}</script>\n<script>{PREVIEW_BRIDGE}</script>"
    );
    Ok(INDEX_HTML.replacen(SCRIPTS, &inline, 1))
}

/// MCP Apps host bridge (JSON-RPC over postMessage): initialize, then wait for the tool result,
/// whose structuredContent carries {research, select}.
const PREVIEW_BRIDGE: &str = r#"(function(){
  let id=0;const send=m=>window.parent.postMessage(Object.assign({jsonrpc:'2.0'},m),'*');
  const apply=r=>{const s=r&&(r.structuredContent||r);if(s&&s.research&&window.__oftResearch)window.__oftResearch(s.research,s.select||'')};
  window.addEventListener('message',e=>{const m=e.data;if(!m||m.jsonrpc!=='2.0')return;
    if(m.id===1&&m.result){send({method:'ui/notifications/initialized',params:{}});return}
    if(typeof m.method==='string'&&/tool-result$/.test(m.method))apply(m.params)});
  send({id:++id,method:'ui/initialize',params:{protocolVersion:'2026-01-26',appInfo:{name:'Kent and Kint Records Map preview',version:'1'},appCapabilities:{}}});
  const size=()=>send({method:'ui/notifications/size-changed',params:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}});
  new ResizeObserver(size).observe(document.documentElement);
})();"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_loads_data_then_app() {
        assert_eq!(INDEX_HTML.matches(SCRIPTS).count(), 1);
    }
}
