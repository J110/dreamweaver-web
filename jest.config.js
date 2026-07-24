module.exports = {
  testEnvironment: 'jest-environment-node',
  testMatch: ['**/*.test.js'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/test/server-only.js',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['next/babel'] }],
  },
};
