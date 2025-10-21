# Setup Scripts for Vivere Stays

This directory contains automated setup scripts that execute the Django management commands described in `SETUP.md` in the proper order.

## Available Scripts

### 1. `setup_project.sh` (Linux/macOS)
Bash script for Unix-like systems.

### 2. `setup_project.ps1` (Windows)
PowerShell script for Windows systems.

## Usage

### Linux/macOS
```bash
# Make the script executable (if needed)
chmod +x setup_project.sh

# Run basic setup (required commands only)
./setup_project.sh

# Run setup with sample data population
./setup_project.sh --populate-data

# Show help
./setup_project.sh --help
```

### Windows PowerShell
```powershell
# Run basic setup (required commands only)
.\setup_project.ps1

# Run setup with sample data population
.\setup_project.ps1 -PopulateData

# Show help
.\setup_project.ps1 -Help
```

## What the Scripts Do

The scripts automate the following Django management commands in order:

### Required Commands (always executed):
1. **Database Migrations**: `python manage.py migrate`
2. **Create PMS Systems**: `python manage.py create_pms_systems`
   - Creates MrPlan, Apaleo, RoomRaccoon, and Avirato Property Management Systems
3. **Create Admin User**: `python manage.py create_admin`
   - Creates a superuser account for Django admin access

### Optional Commands (with `--populate-data` / `-PopulateData`):
4. **Populate Price History**: `python manage.py populate_price_history`
   - Creates dummy price history data for past 100 days and future 100 days
5. **Populate Daily Performance**: `python manage.py populate_daily_performance`
   - Seeds analytics system with sample performance data
6. **Populate Competitor Prices**: `python manage.py populate_competitor_prices`
   - Creates dummy competitor price data for dynamic pricing
7. **Populate Unified Rooms and Rates**: `python manage.py populate_unified_rooms_rates`
   - Creates sample room and rate data matching the frontend interface

## Prerequisites

Before running these scripts, ensure:

1. **Docker is running** on your system
2. **Docker Compose services are started**: `docker-compose up`
3. **You're in the project root directory** (where `docker-compose.yml` is located)
4. **Backend service is ready** (scripts will wait for it automatically)

## Error Handling

The scripts include comprehensive error handling:
- **Pre-flight checks**: Verify Docker is running and docker-compose.yml exists
- **Service readiness**: Wait for backend service to be ready before executing commands
- **Command validation**: Check exit codes and provide meaningful error messages
- **Graceful degradation**: Sample data population failures won't stop the entire setup

## Sample Data Notes

The sample data population commands are optional and may fail if:
- No properties exist in the database yet
- Dependencies between data aren't met
- The commands are run multiple times (duplicate data issues)

This is normal behavior, and the scripts will continue with warnings rather than failing completely.

## Manual Execution

If you prefer to run commands manually, refer to the `SETUP.md` file for the complete step-by-step process. The scripts simply automate the Django management command execution portion of that setup.

## Troubleshooting

### Common Issues:
1. **"Docker is not running"**: Start Docker Desktop or Docker daemon
2. **"docker-compose.yml not found"**: Run script from project root directory
3. **"Backend service failed to start"**: Check `docker-compose logs vivere_backend`
4. **Permission denied (Linux/macOS)**: Run `chmod +x setup_project.sh`

### Manual Command Execution:
If scripts fail, you can run the Django commands manually:
```bash
# Run each command individually
docker-compose exec vivere_backend python manage.py migrate
docker-compose exec vivere_backend python manage.py create_pms_systems
docker-compose exec vivere_backend python manage.py create_admin
# ... etc
```

## Integration with SETUP.md

These scripts complement the manual setup process described in `SETUP.md`. They automate steps 5-7 of the setup guide:
- Step 5: Run Database Migrations
- Step 6: Create Initial Data (PMS Systems and Admin User)
- Step 7: Populate Sample Data (optional)

You still need to complete the other setup steps manually:
- Environment variable configuration
- Frontend dependency installation (`npm install`)
- Starting services (`docker-compose up`)
