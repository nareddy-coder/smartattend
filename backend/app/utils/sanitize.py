import re


def sanitize_csv_field(value: str) -> str:
    """Strip formula injection characters from CSV field values."""
    if not value:
        return value
    # Remove leading characters that could trigger formula execution in Excel
    return re.sub(r'^[=+\-@\t\r]+', '', str(value))


def sanitize_string(value: str) -> str:
    """Strip HTML tags and trim whitespace."""
    if not value:
        return value
    cleaned = re.sub(r'<[^>]+>', '', str(value))
    return cleaned.strip()
