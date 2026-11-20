//! Nightly research backup (PRD §4.6, §9) and OAuth clean-up. Checked hourly; a backup is taken
//! when the last nightly one is more than 23 hours old, so restarts do not skip or double it.

use std::time::Duration;

use oft_db::sqlx::PgPool;

pub async fn nightly(pool: PgPool) {
    let mut tick = tokio::time::interval(Duration::from_secs(3600));
    loop {
        tick.tick().await;
        if let Err(e) = run(&pool).await {
            tracing::error!("nightly job: {e}");
        }
    }
}

async fn run(pool: &PgPool) -> Result<(), crate::ops::Error> {
    let mut c = pool.acquire().await?;
    let due = oft_db::last_backup_at(&mut c, "nightly")
        .await?
        .is_none_or(|t| chrono::Utc::now() - t > chrono::Duration::hours(23));
    if due {
        let id = crate::ops::backup(&mut c, "nightly", None).await?;
        let pruned = oft_db::prune_backups(&mut c).await?;
        tracing::info!(%id, pruned, "nightly research backup");
    }
    oft_db::oauth_cleanup(&mut c).await?;
    Ok(())
}
