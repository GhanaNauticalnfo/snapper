// jest.preset.js (WORKSPACE ROOT)
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js|html)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  modulePathIgnorePatterns: ['<rootDir>/.nx/cache', '<rootDir>/dist/'],
  // --- Add/Verify Ignore Patterns ---
  testPathIgnorePatterns: [
      "/node_modules/",
      "/apps/admin-e2e/",
      "/apps/frontend-e2e/"
      // Add others if needed, e.g., specific build output folders not caught by modulePathIgnorePatterns
  ],
  // --- End Ignore Patterns ---
  coverageReporters: ['html', 'text'],
};