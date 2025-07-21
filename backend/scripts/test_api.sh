#!/bin/bash

# API Testing Script for Vivere Stays
# Usage: ./scripts/test_api.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8000"
API_BASE="$BASE_URL/api"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if server is running
check_server() {
    if curl -s "$BASE_URL/admin/" > /dev/null 2>&1; then
        print_status "Server is running at $BASE_URL"
        return 0
    else
        print_error "Server is not running at $BASE_URL"
        print_warning "Start the server with: python manage.py runserver"
        return 1
    fi
}

# Function to get JWT token
get_token() {
    print_status "Getting JWT token..."
    
    # Create a test user if it doesn't exist
    python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(username='testuser').exists():
    User.objects.create_user('testuser', 'test@example.com', 'testpass123')
    print('Test user created')
else:
    print('Test user already exists')
"
    
    # Get token using Django shell
    TOKEN=$(python manage.py shell -c "
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
user = User.objects.get(username='testuser')
refresh = RefreshToken.for_user(user)
print(refresh.access_token)
")
    
    echo "$TOKEN"
}

# Function to test authentication endpoints
test_auth() {
    print_status "Testing authentication endpoints..."
    
    TOKEN=$(get_token)
    
    # Test protected endpoint
    RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/dynamic-pricing/properties/" -o /tmp/response.json)
    
    HTTP_CODE="${RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Authentication test passed"
        cat /tmp/response.json | python -m json.tool
    else
        print_error "Authentication test failed (HTTP $HTTP_CODE)"
        cat /tmp/response.json
    fi
}

# Function to test property creation
test_create_property() {
    print_status "Testing property creation..."
    
    TOKEN=$(get_token)
    
    # Test data
    PROPERTY_DATA='{
        "name": "Test Hotel API",
        "booking_hotel_url": "https://www.booking.com/hotel/test-api.html",
        "street_address": "123 Test Street",
        "city": "Test City",
        "country": "Test Country",
        "postal_code": "12345"
    }'
    
    RESPONSE=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PROPERTY_DATA" \
        "$API_BASE/dynamic-pricing/properties/create/" -o /tmp/response.json)
    
    HTTP_CODE="${RESPONSE: -3}"
    if [ "$HTTP_CODE" = "201" ]; then
        print_status "Property creation test passed"
        cat /tmp/response.json | python -m json.tool
    else
        print_error "Property creation test failed (HTTP $HTTP_CODE)"
        cat /tmp/response.json
    fi
}

# Function to test property listing
test_list_properties() {
    print_status "Testing property listing..."
    
    TOKEN=$(get_token)
    
    RESPONSE=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/dynamic-pricing/properties/" -o /tmp/response.json)
    
    HTTP_CODE="${RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Property listing test passed"
        cat /tmp/response.json | python -m json.tool
    else
        print_error "Property listing test failed (HTTP $HTTP_CODE)"
        cat /tmp/response.json
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running all API tests..."
    
    if ! check_server; then
        exit 1
    fi
    
    test_auth
    test_create_property
    test_list_properties
    
    print_status "All tests completed!"
}

# Function to show help
show_help() {
    echo "Vivere Stays API Testing Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  auth          Test authentication endpoints"
    echo "  create        Test property creation"
    echo "  list          Test property listing"
    echo "  all           Run all tests"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 auth"
    echo "  $0 create"
    echo "  $0 all"
}

# Main script logic
case "${1:-all}" in
    "auth")
        check_server && test_auth
        ;;
    "create")
        check_server && test_create_property
        ;;
    "list")
        check_server && test_list_properties
        ;;
    "all")
        run_all_tests
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 