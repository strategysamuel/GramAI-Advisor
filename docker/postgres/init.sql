-- Initialize GramAI Advisor Database
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS advisory;
CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS schemes;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA profiles TO gramai_user;
GRANT ALL PRIVILEGES ON SCHEMA advisory TO gramai_user;
GRANT ALL PRIVILEGES ON SCHEMA market TO gramai_user;
GRANT ALL PRIVILEGES ON SCHEMA finance TO gramai_user;
GRANT ALL PRIVILEGES ON SCHEMA documents TO gramai_user;
GRANT ALL PRIVILEGES ON SCHEMA schemes TO gramai_user;

-- Create initial tables will be handled by migration scripts
COMMENT ON DATABASE gramai_advisor IS 'GramAI Advisor - AI-powered rural decision support platform';