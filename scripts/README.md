# Scripts

This directory contains utility scripts for database management and development tasks.

## Files

### `reset-database.js`
**Purpose:** Completely resets the database by dropping all tables and running fresh migrations  
**Usage:** `node scripts/reset-database.js` or `npm run db:reset:test`  
**What it does:** Drops database schema → Runs all migrations → Inserts test data  
**Use case:** Clean slate for testing, fixing corrupted data, or verifying migrations work from scratch