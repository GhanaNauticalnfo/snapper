// apps/api/jest.config.ts (NEW FILE)
/* eslint-disable */
export default {
    displayName: 'api',
    preset: '../../jest.preset.js', // Inherit from root preset
    testEnvironment: 'node',        // Specify node environment
    // Tell ts-jest to use the project-specific tsconfig.spec.json
    transform: {
      '^.+\\.[tj]s$': [
        'ts-jest',
        { tsconfig: '<rootDir>/tsconfig.spec.json' }, // <rootDir> here refers to apps/api
      ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/apps/api',
    // Add any API-specific Jest settings here if needed
  };