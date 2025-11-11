# Vivere Stays Backend

docker-compose exec vivere_backend python manage.py makemigrations
docker-compose exec vivere_backend python manage.py migrate

# Run tests
docker-compose exec vivere_backend python manage.py test --settings=vivere_stays.test_settings

# docker remote db (production db)
docker compose -f docker-compose.remote.yml restart vivere_backend
docker compose -f docker-compose.remote.yml up -d
docker compose -f docker-compose.remote.yml build --no-cache
docker compose -f docker-compose.remote.yml up --build vivere_backend -d 
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate_legacy_properties --dry-run
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate_legacy_properties
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py copy_dynamic_tables 
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate_property_competitors --dry-run
docker compose -f docker-compose.remote.yml exec vivere_backend python manage.py migrate_property_competitors

# Startapp
docker-compose exec vivere_backend python manage.py startapp booking

# Populate Database
docker-compose exec vivere_backend python manage.py populate_price_history --delete-existing
docker-compose exec vivere_backend python manage.py populate_competitor_prices --delete-existing
docker-compose exec vivere_backend python manage.py populate_daily_performance

# Server commands
https://vivere-fe.algobeat.com/
https://vivere-stays.algobeat.com/
ssh root@46.62.171.162
docker-compose down
./deploy-all.sh
./deploy-frontend.sh
./deploy-backend.sh
docker-compose logs -f vivere_backend
19391

# Production IP
http://35.226.220.107:8000/api/profiles/check-auth/
