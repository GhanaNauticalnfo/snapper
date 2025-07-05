# Angular 

ogr2ogr -f "PostgreSQL" \
  PG:"host=localhost port=5433 dbname=gisdb user=user password=password" \
  volta_test_sat_data.geojson \ # <-- Your GeoJSON filename
  -nln public.volta_river_depths \ # Target table name
  -lco GEOMETRY_NAME=geom \ # Target geometry column
  -lco FID=fid \ # Map GeoJSON 'fid' to PostgreSQL 'fid' primary key
                 # If using BIGSERIAL 'id', remove this line
  -nlt MULTIPOLYGON \ # Ensure geometry type is MultiPolygon
  -t_srs EPSG:4326 \ # Transform to WGS84 if necessary (confirm source SRID)
  -sql "SELECT fid, \"group\" AS group_code, Description, geometry FROM test" \ # Select and rename 'group' -> 'group_code'
  -dialect OGRSQL \ # Use OGR SQL dialect for the SELECT statement
  -skipfailures \
  --config PG_USE_COPY YES \
  -makevalid # Attempt to fix invalid geometries

## Generate Component

npx nx g @nx/angular:component apps/admin/src/app/forbidden/forbidden




# Run all tests for the 'api' project
nx test api

# Or, run only tests matching a specific pattern (e.g., volta-depth)
nx test api --testFile=volta-depth



find . -type f -not -path "*/\.*/*" -not -path "*/dist/*" -not -path "*/node_modules/*" -not -path "*/example-standalone/*"


find . -type f -not -path "*/\.*/*" -not -path "*/dist/*" -not -path "*/node_modules/*" -not -path "*/example-standalone/*" -exec bash -c 'if [[ "{}" == *.ts || "{}" == *.docx || "{}" == *.md ]]; then echo "FILENAME: {}"; else echo "FILENAME: {}"; echo "CONTENTS:"; cat "{}"; echo -e "\n----------------------------------------\n"; fi' \;






-----
Make Docker
Make Nginx

Deploy API



kubectl create secret generic snapper-postgres-secret \
  --namespace=test \
  --from-literal=POSTGRES_PASSWORD= \
  --from-literal=POSTGRES_USER=snapper_user \
  --from-literal=DATABASE_URL=postgresql://snapper_user:your-secure-password@postgres-service:5432/snapper_db


# For test environment
kubectl create secret generic snapper-postgres-secret \
  --namespace=test \
  --from-literal=POSTGRES_PASSWORD=cvpFaddBk6UVRdepu3YGCc5r1Hnm9LcK \
  --from-literal=POSTGRES_USER=snapper_user \
  --from-literal=DATABASE_URL=postgresql://snapper_user:cvpFaddBk6UVRdepu3YGCc5r1Hnm9LcK@snapper-postgres-service:5432/snapper_db

# For production environment
kubectl create secret generic snapper-postgres-secret \
  --namespace=prod \
  --from-literal=POSTGRES_PASSWORD=3TEquF/D6M4m+wWEB/8jC+qVTQvatab2 \
  --from-literal=POSTGRES_USER=snapper_user \
  --from-literal=DATABASE_URL=postgresql://snapper_user:3TEquF/D6M4m+wWEB/8jC+qVTQvatab2@snapper-postgres-service:5432/snapper_db