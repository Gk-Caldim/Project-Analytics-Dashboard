from fastapi import APIRouter, HTTPException
import httpx
import logging

router = APIRouter(prefix="/currency", tags=["Currency"])
logger = logging.getLogger(__name__)

import time

# Cache for exchange rates to avoid excessive external calls
_rates_cache = {
    "rates": { "USD": 1, "INR": 95.43, "EUR": 0.92, "GBP": 0.80, "JPY": 155.0 },
    "timestamp": time.time()
}

@router.get("/rates")
async def get_exchange_rates():
    """
    Fetch live exchange rates from an external API.
    Returns USD-based rates for INR, EUR, etc.
    """
    global _rates_cache
    
    # Simple TTL cache (e.g., 1 hour = 3600 seconds)
    current_time = time.time()
    
    if current_time - _rates_cache["timestamp"] < 3600:
        return _rates_cache["rates"]
    
    try:
        async with httpx.AsyncClient() as client:
            # Using open.er-api.com which is free and requires no key for latest rates
            response = await client.get("https://open.er-api.com/v6/latest/USD", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("result") == "success":
                    rates = data.get("rates", {})
                    # Filter for currencies we care about or return all
                    # For now, let's just ensure INR and EUR are there
                    processed_rates = {
                        "USD": 1,
                        "INR": rates.get("INR", 95.43),
                        "EUR": rates.get("EUR", 0.92),
                        "GBP": rates.get("GBP", 0.80),
                        "JPY": rates.get("JPY", 155.0)
                    }
                    _rates_cache = {
                        "rates": processed_rates,
                        "timestamp": current_time
                    }
                    return processed_rates
            
            logger.error(f"Failed to fetch rates: Status {response.status_code}")
            return _rates_cache["rates"] # Fallback to cache/defaults
            
    except Exception as e:
        logger.error(f"Error fetching exchange rates: {str(e)}")
        return _rates_cache["rates"] # Fallback to cache/defaults
