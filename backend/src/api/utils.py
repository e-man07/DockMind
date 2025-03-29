import hashlib
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union

def calculate_file_hash(file_path: Union[str, Path]) -> str:
    """
    Calculate SHA-256 hash of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Hash string of the file
    """
    file_path = Path(file_path)
    hash_obj = hashlib.sha256()
    
    with open(file_path, "rb") as f:
        # Read in chunks to handle large files
        for chunk in iter(lambda: f.read(4096), b""):
            hash_obj.update(chunk)
    
    return hash_obj.hexdigest()

def format_pagination_metadata(
    total_items: int,
    limit: int,
    offset: int,
    base_url: str
) -> Dict[str, Any]:
    """
    Generate pagination metadata for API responses.
    
    Args:
        total_items: Total number of items
        limit: Items per page
        offset: Current offset
        base_url: Base URL for links
        
    Returns:
        Dictionary with pagination metadata and links
    """
    total_pages = (total_items + limit - 1) // limit if limit > 0 else 0
    current_page = (offset // limit) + 1 if limit > 0 else 1
    
    # Generate pagination links
    links = {}
    
    # Add first page link
    links["first"] = f"{base_url}?limit={limit}&offset=0"
    
    # Add last page link if there are items
    if total_pages > 0:
        links["last"] = f"{base_url}?limit={limit}&offset={(total_pages - 1) * limit}"
    
    # Add next page link if not on last page
    if current_page < total_pages:
        links["next"] = f"{base_url}?limit={limit}&offset={offset + limit}"
    
    # Add previous page link if not on first page
    if current_page > 1:
        links["prev"] = f"{base_url}?limit={limit}&offset={max(0, offset - limit)}"
    
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": current_page,
        "limit": limit,
        "offset": offset,
        "links": links
    }

def safe_json_parse(json_str: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Safely parse a JSON string, returning None if parsing fails.
    
    Args:
        json_str: JSON string to parse
        
    Returns:
        Parsed dictionary or None if parsing failed
    """
    if not json_str:
        return None
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None
