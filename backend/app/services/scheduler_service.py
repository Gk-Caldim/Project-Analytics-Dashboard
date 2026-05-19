import logging
import asyncio
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.database import get_db

logger = logging.getLogger(__name__)

# Initialize background scheduler
scheduler = BackgroundScheduler()


def init_scheduler():
    """
    Start the background scheduler and schedule the market refresh job.
    """
    if not scheduler.running:
        try:
            scheduler.start()
            logger.info("APScheduler background scheduler started.")
            
            # Refresh market snapshots and run risk alerts hourly
            scheduler.add_job(
                run_market_refresh,
                "interval",
                hours=1,
                id="market_refresh_job",
                replace_existing=True
            )
            
            # Execute once immediately on startup in a separate thread
            import threading
            threading.Thread(target=run_market_refresh, daemon=True).start()
            
        except Exception as e:
            logger.error(f"Failed to start APScheduler: {e}")


def run_market_refresh():
    """
    Bridge function to execute the async refresh_market_data inside a database session.
    """
    logger.info("Executing scheduled task: refreshing market registry snapshots...")
    db_gen = get_db()
    try:
        db = next(db_gen)
        from app.services.market_service import refresh_market_data
        
        # Run async event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(refresh_market_data(db))
        loop.close()
        
    except Exception as e:
        logger.error(f"Error running scheduled market data refresh: {e}")
    finally:
        try:
            db_gen.close()
        except Exception:
            pass
