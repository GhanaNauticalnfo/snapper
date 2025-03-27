#!/bin/bash
# Script to rename an NX project

# Usage information
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 OLD_NAME NEW_NAME"
  exit 1
fi

OLD_NAME=$1
NEW_NAME=$2

echo "Renaming NX project from '$OLD_NAME' to '$NEW_NAME'"

# 1. Rename the project directory
if [ -d "apps/$OLD_NAME" ]; then
  echo "Renaming app directory..."
  mv "apps/$OLD_NAME" "apps/$NEW_NAME"
elif [ -d "libs/$OLD_NAME" ]; then
  echo "Renaming lib directory..."
  mv "libs/$OLD_NAME" "libs/$NEW_NAME"
else
  echo "Project directory not found in apps/ or libs/. Please check the project name."
  exit 1
fi

# 2. Update project configuration files
echo "Updating project.json files..."
find . -name "project.json" -type f -exec sed -i "s/\"name\": \"$OLD_NAME\"/\"name\": \"$NEW_NAME\"/g" {} \;

# 3. Update nx.json if it exists
if [ -f "nx.json" ]; then
  echo "Updating nx.json..."
  sed -i "s/\"$OLD_NAME\"/\"$NEW_NAME\"/g" nx.json
fi

# 4. Update workspace.json if it exists (older NX versions)
if [ -f "workspace.json" ]; then
  echo "Updating workspace.json..."
  sed -i "s/\"$OLD_NAME\"/\"$NEW_NAME\"/g" workspace.json
fi

# 5. Update imports in TypeScript/JavaScript files
echo "Updating imports in code files..."
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) -exec sed -i "s/from ['\"]@.*\/$OLD_NAME/from '@nx\/$NEW_NAME/g" {} \;
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) -exec sed -i "s/from ['\"]\.\.\/\.\.\/$OLD_NAME/from '..\/..\/\$NEW_NAME/g" {} \;

# 6. Update tsconfig paths if they exist
find . -name "tsconfig*.json" -type f -exec sed -i "s/\"@.*\/$OLD_NAME/\"@nx\/$NEW_NAME/g" {} \;

echo "Project renamed from '$OLD_NAME' to '$NEW_NAME'"
echo "Note: You may need to manually check for other references that weren't automatically updated."
echo "Run 'nx graph' to verify your workspace structure after the rename."
