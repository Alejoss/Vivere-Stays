# Vivere Stays Project Setup Script (PowerShell)
# This script automates the setup process described in SETUP.md

param(
    [switch]$PopulateData,
    [switch]$Help
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
function Test-Docker {
    Write-Status "Checking if Docker is running..."
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Check if docker-compose.yml exists
function Test-DockerCompose {
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Error "docker-compose.yml not found. Please run this script from the project root directory."
        exit 1
    }
    Write-Success "docker-compose.yml found"
}

# Wait for backend to be ready
function Wait-ForBackend {
    Write-Status "Waiting for backend service to be ready..."
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $result = docker-compose exec -T vivere_backend python manage.py check --deploy 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Backend service is ready"
                return
            }
        }
        catch {
            # Continue to next attempt
        }
        
        Write-Status "Attempt $attempt/$maxAttempts - Backend not ready yet, waiting 5 seconds..."
        Start-Sleep -Seconds 5
        $attempt++
    }
    
    Write-Error "Backend service failed to start within expected time"
    exit 1
}

# Run database migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    try {
        docker-compose exec -T vivere_backend python manage.py migrate
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database migrations completed successfully"
        } else {
            Write-Error "Database migrations failed"
            exit 1
        }
    }
    catch {
        Write-Error "Database migrations failed: $_"
        exit 1
    }
}

# Create Property Management Systems
function New-PMSSystems {
    Write-Status "Creating Property Management Systems..."
    try {
        docker-compose exec -T vivere_backend python manage.py create_pms_systems
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Property Management Systems created successfully"
        } else {
            Write-Error "Failed to create Property Management Systems"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to create Property Management Systems: $_"
        exit 1
    }
}

# Create admin user
function New-AdminUser {
    Write-Status "Creating admin user..."
    try {
        docker-compose exec -T vivere_backend python manage.py create_admin
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Admin user created successfully"
        } else {
            Write-Error "Failed to create admin user"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to create admin user: $_"
        exit 1
    }
}

# Populate sample data (optional)
function Invoke-PopulateSampleData {
    param([bool]$Populate)
    
    if ($Populate) {
        Write-Status "Populating sample data..."
        
        # Populate price history
        Write-Status "Creating price history data..."
        try {
            docker-compose exec -T vivere_backend python manage.py populate_price_history
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Price history data created"
            } else {
                Write-Warning "Failed to create price history data (this might be expected if no properties exist yet)"
            }
        }
        catch {
            Write-Warning "Failed to create price history data: $_"
        }
        
        # Populate daily performance analytics
        Write-Status "Creating daily performance analytics data..."
        try {
            docker-compose exec -T vivere_backend python manage.py populate_daily_performance
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Daily performance analytics data created"
            } else {
                Write-Warning "Failed to create daily performance analytics data"
            }
        }
        catch {
            Write-Warning "Failed to create daily performance analytics data: $_"
        }
        
        # Populate competitor prices
        Write-Status "Creating competitor price data..."
        try {
            docker-compose exec -T vivere_backend python manage.py populate_competitor_prices
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Competitor price data created"
            } else {
                Write-Warning "Failed to create competitor price data"
            }
        }
        catch {
            Write-Warning "Failed to create competitor price data: $_"
        }
        
        # Populate unified rooms and rates
        Write-Status "Creating unified rooms and rates data..."
        try {
            docker-compose exec -T vivere_backend python manage.py populate_unified_rooms_rates
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Unified rooms and rates data created"
            } else {
                Write-Warning "Failed to create unified rooms and rates data"
            }
        }
        catch {
            Write-Warning "Failed to create unified rooms and rates data: $_"
        }
    } else {
        Write-Status "Skipping sample data population (use -PopulateData to include)"
    }
}

# Show help
function Show-Help {
    Write-Host "Usage: .\setup_project.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -PopulateData     Populate database with sample data (optional)"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "This script automates the setup process for Vivere Stays project."
    Write-Host "Make sure Docker is running and you're in the project root directory."
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    Write-Status "Starting Vivere Stays setup process..."
    
    # Pre-flight checks
    Test-Docker
    Test-DockerCompose
    
    # Wait for backend to be ready
    Wait-ForBackend
    
    # Execute setup commands in order
    Invoke-Migrations
    New-PMSSystems
    New-AdminUser
    Invoke-PopulateSampleData $PopulateData
    
    Write-Success "🎉 Vivere Stays setup completed successfully!"
    Write-Host ""
    Write-Status "You can now access:"
    Write-Host "  - Frontend: http://localhost:3000"
    Write-Host "  - Backend API: http://localhost:8000"
    Write-Host "  - Django Admin: http://localhost:8000/admin"
    Write-Host ""
    Write-Status "To start the frontend development server:"
    Write-Host "  cd frontend; npm run dev"
}

# Run main function
Main
