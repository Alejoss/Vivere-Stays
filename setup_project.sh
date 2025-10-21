#!/bin/bash

# Vivere Stays Project Setup Script
# This script automates the setup process described in SETUP.md

set -e  # Exit on any error

echo "🚀 Starting Vivere Stays Project Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking if Docker is running..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if docker-compose.yml exists
check_docker_compose() {
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Please run this script from the project root directory."
        exit 1
    fi
    print_success "docker-compose.yml found"
}

# Wait for backend to be ready
wait_for_backend() {
    print_status "Waiting for backend service to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T vivere_backend python manage.py check --deploy > /dev/null 2>&1; then
            print_success "Backend service is ready"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Backend not ready yet, waiting 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_error "Backend service failed to start within expected time"
    exit 1
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    if docker-compose exec -T vivere_backend python manage.py migrate; then
        print_success "Database migrations completed successfully"
    else
        print_error "Database migrations failed"
        exit 1
    fi
}

# Create Property Management Systems
create_pms_systems() {
    print_status "Creating Property Management Systems..."
    if docker-compose exec -T vivere_backend python manage.py create_pms_systems; then
        print_success "Property Management Systems created successfully"
    else
        print_error "Failed to create Property Management Systems"
        exit 1
    fi
}

# Create admin user
create_admin_user() {
    print_status "Creating admin user..."
    if docker-compose exec -T vivere_backend python manage.py create_admin; then
        print_success "Admin user created successfully"
    else
        print_error "Failed to create admin user"
        exit 1
    fi
}

# Populate sample data (optional)
populate_sample_data() {
    local populate_data=$1
    
    if [ "$populate_data" = "true" ]; then
        print_status "Populating sample data..."
        
        # Populate price history
        print_status "Creating price history data..."
        if docker-compose exec -T vivere_backend python manage.py populate_price_history; then
            print_success "Price history data created"
        else
            print_warning "Failed to create price history data (this might be expected if no properties exist yet)"
        fi
        
        # Populate daily performance analytics
        print_status "Creating daily performance analytics data..."
        if docker-compose exec -T vivere_backend python manage.py populate_daily_performance; then
            print_success "Daily performance analytics data created"
        else
            print_warning "Failed to create daily performance analytics data"
        fi
        
        # Populate competitor prices
        print_status "Creating competitor price data..."
        if docker-compose exec -T vivere_backend python manage.py populate_competitor_prices; then
            print_success "Competitor price data created"
        else
            print_warning "Failed to create competitor price data"
        fi
        
        # Populate unified rooms and rates
        print_status "Creating unified rooms and rates data..."
        if docker-compose exec -T vivere_backend python manage.py populate_unified_rooms_rates; then
            print_success "Unified rooms and rates data created"
        else
            print_warning "Failed to create unified rooms and rates data"
        fi
    else
        print_status "Skipping sample data population (use --populate-data to include)"
    fi
}

# Main execution
main() {
    local populate_data="false"
    local help="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --populate-data)
                populate_data="true"
                shift
                ;;
            --help|-h)
                help="true"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    if [ "$help" = "true" ]; then
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --populate-data    Populate database with sample data (optional)"
        echo "  --help, -h         Show this help message"
        echo ""
        echo "This script automates the setup process for Vivere Stays project."
        echo "Make sure Docker is running and you're in the project root directory."
        exit 0
    fi
    
    print_status "Starting Vivere Stays setup process..."
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    
    # Wait for backend to be ready
    wait_for_backend
    
    # Execute setup commands in order
    run_migrations
    create_pms_systems
    create_admin_user
    populate_sample_data "$populate_data"
    
    print_success "🎉 Vivere Stays setup completed successfully!"
    echo ""
    print_status "You can now access:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - Django Admin: http://localhost:8000/admin"
    echo ""
    print_status "To start the frontend development server:"
    echo "  cd frontend && npm run dev"
}

# Run main function with all arguments
main "$@"
