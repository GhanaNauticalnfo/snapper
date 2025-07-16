#!/bin/bash

echo "Testing Tailwind font-size changes..."

# Test building the map library
echo "Building map library..."
cd /Users/kaspernielsen/gma/Github/ghanawaters
npx nx build map

# Test building the shared library
echo "Building shared library..."
npx nx build shared

# Test building the frontend app
echo "Building frontend app..."
npx nx build frontend

# Test building the admin app
echo "Building admin app..."
npx nx build admin

echo "All builds completed. Check for any TypeScript errors above."