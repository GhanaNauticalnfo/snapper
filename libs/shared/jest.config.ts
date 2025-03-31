// libs/shared/jest.config.ts (MODIFIED FILE)
/* eslint-disable */
export default {
  displayName: 'shared',
  preset: '../../jest.preset.js', // Inherit from root preset
  testEnvironment: 'node',
  // transform section removed - inherited from preset
  moduleFileExtensions: ['ts', 'js', 'html'], // Can likely be inherited too
  coverageDirectory: '../../coverage/libs/shared',
};