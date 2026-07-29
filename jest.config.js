module.exports = {
  testEnvironment: 'jest-environment-node',
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/test/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/test/server-only.js',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['next/babel'] }],
  },
};
