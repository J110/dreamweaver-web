module.exports = {
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['next/babel'] }],
  },
};
