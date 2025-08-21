# Competitor API Integration Setup

This document explains how to set up the external competitor API integration.

## Environment Variables

Add the following environment variable to your `.env` file:

```bash
# External Competitor API Settings
COMPETITOR_API_TOKEN=your-api-token-here
```

## Configuration

1. **COMPETITOR_API_BASE_URL**: The base URL of the competitor API service (configured in `settings.py`)
2. **COMPETITOR_API_TOKEN**: The Bearer token for authentication (use the password provided by the API provider)

## API Endpoint

The new endpoint is available at:
```
POST /api/dynamic-pricing/fetch-competitors/
```

### Request Format
```json
{
    "booking_url": "https://booking.com/hotel/us/grand-hotel-spa.html"
}
```

### Response Format
```json
{
    "message": "Successfully found 5 competitors",
    "target_hotel": {
        "name": "Grand Hotel & Spa",
        "booking_url": "https://booking.com/hotel/us/grand-hotel-spa.html",
        "review_score": 8.5,
        "location": {
            "address": "123 Main Street, New York, NY 10001",
            "city": "New York",
            "country": "United States",
            "latitude": 40.7128,
            "longitude": -74.006
        }
    },
    "competitors": [
        {
            "name": "Luxury Hotel & Resort",
            "booking_url": "https://booking.com/hotel/us/luxury-hotel-resort.html",
            "review_score": 8.3,
            "similarity_score": 0.85,
            "distance_km": 0.8,
            "location": {
                "address": "456 Luxury Ave, New York, NY 10002",
                "city": "New York",
                "country": "United States",
                "latitude": 40.713,
                "longitude": -74.0065
            },
            "amenities": ["WiFi", "Pool", "Spa", "Restaurant", "Gym"]
        }
    ],
    "processing_time_ms": 2450.5,
    "total_competitors_found": 5
}
```

## Error Handling

The endpoint handles various error scenarios:

- **400 Bad Request**: Missing or invalid booking URL
- **401 Unauthorized**: Authentication failed with the external API
- **404 Not Found**: No competitors found for the provided URL
- **503 Service Unavailable**: External API is not available or not configured
- **504 Gateway Timeout**: Request to external API timed out
- **500 Internal Server Error**: Unexpected errors

## Usage Example

```python
import requests

# Make a request to fetch competitors
response = requests.post(
    'http://localhost:8000/api/dynamic-pricing/fetch-competitors/',
    headers={
        'Authorization': 'Bearer your-jwt-token',
        'Content-Type': 'application/json'
    },
    json={
        'booking_url': 'https://booking.com/hotel/us/grand-hotel-spa.html'
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Found {len(data['competitors'])} competitors")
    for competitor in data['competitors']:
        print(f"- {competitor['name']} (Score: {competitor['similarity_score']})")
else:
    print(f"Error: {response.json()}")
```

## Frontend Integration

From your frontend, you can call this endpoint like this:

```javascript
const fetchCompetitors = async (bookingUrl) => {
    try {
        const response = await fetch('/api/dynamic-pricing/fetch-competitors/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                booking_url: bookingUrl
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch competitors');
        }
    } catch (error) {
        console.error('Error fetching competitors:', error);
        throw error;
    }
};
```
