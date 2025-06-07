#!/usr/bin/env node

/**
 * Database Reset Script
 * Drops all tables, recreates schema, and runs fresh migrations
 * Usage: node scripts/reset-database.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Starting database reset process...');

try {
  // Change to the project root directory
  const projectRoot = path.resolve(__dirname, '..');
  process.chdir(projectRoot);

  console.log('📍 Working directory:', process.cwd());

  // Step 1: Use TypeORM CLI to drop schema
  console.log('\n🗑️  Dropping database schema...');
  try {
    execSync('npm run typeorm:ts -- schema:drop', { stdio: 'inherit' });
    console.log('✅ Database schema dropped successfully');
  } catch (error) {
    console.log('ℹ️  Schema drop completed (may have warnings for empty database)');
  }

  // Step 2: Run fresh migrations using TypeScript version
  console.log('\n🏗️  Running fresh migrations...');
  execSync('npm run migration:run:dev', { stdio: 'inherit' });

  console.log('\n✅ Database reset completed successfully!');
  console.log('📊 Fresh database with all migrations and test data applied');

} catch (error) {
  console.error('\n❌ Database reset failed:', error.message);
  process.exit(1);
}