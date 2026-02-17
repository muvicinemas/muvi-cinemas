-- Initialize all Muvi databases on first run
-- This script runs automatically when the postgres container starts for the first time

CREATE DATABASE identity_db;
CREATE DATABASE main_db;
CREATE DATABASE payment_db;
CREATE DATABASE fb_db;
CREATE DATABASE notification_db;
CREATE DATABASE offer_db;

-- Install generate_ulid() in each database
\c identity_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
\c main_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
\c payment_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
\c fb_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
\c notification_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
\c offer_db
\i /docker-entrypoint-initdb.d/create-ulid.sql
