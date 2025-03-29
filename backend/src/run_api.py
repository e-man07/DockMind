import os
import uvicorn
from pathlib import Path
from loguru import logger

def setup_logger():
    """Set up the logger with file and console output."""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    logger.add("logs/api.log", rotation="500 MB", level="INFO")
    logger.info("API logger initialized")

def main():
    """Run the API server."""
    setup_logger()
    
    # Get port from environment variable or use default
    port = int(os.environ.get("API_PORT", 8000))
    
    logger.info(f"Starting API server on port {port}")
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Set to False in production
        log_level="info"
    )

if __name__ == "__main__":
    main()
