from database.service import DatabaseService

# Create a singleton database service instance
db_service = DatabaseService()

def get_db_service() -> DatabaseService:
    """
    Dependency to get database service instance.
    Used with FastAPI Depends() for endpoints that need database access.
    """
    return db_service
