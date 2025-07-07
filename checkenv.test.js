require('dotenv').config(); // Make sure dotenv is installed: npm install dotenv
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('SHADOW_DATABASE_URL:', process.env.SHADOW_DATABASE_URL);

/*
CREATE DATABASE nextappdb_shadow
    WITH
    OWNER = "Sorin"
    ENCODING = 'UTF8'
    LC_COLLATE = 'French_France.1252'
    LC_CTYPE = 'French_France.1252'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

GRANT TEMPORARY, CONNECT ON DATABASE nextappdb_shadow TO PUBLIC;

GRANT ALL ON DATABASE nextappdb_shadow TO "Sorin"; */

/* GRANT ALL PRIVILEGES ON DATABASE nextappdb_shadow TO "Sorin";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "Sorin";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "Sorin";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "Sorin";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "Sorin";*/