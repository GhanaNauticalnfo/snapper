#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get BUILD_TAG from environment variable, default to 'development'
const buildTag = process.env.BUILD_TAG || 'development';

// Get environment argument from command line, default to 'prod'
const environment = process.argv[2] || 'prod';

// Path to the environment file
const envFile = path.join(__dirname, '..', 'src', 'environments', `environment.${environment}.ts`);

// Read the file
let content = fs.readFileSync(envFile, 'utf8');

// Replace the buildTag value
content = content.replace(/buildTag: '[^']*'/, `buildTag: '${buildTag}'`);

// Write the file back
fs.writeFileSync(envFile, content);

console.log(`Updated ${envFile} with buildTag: ${buildTag}`);