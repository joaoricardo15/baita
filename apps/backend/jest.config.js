module.exports = {
  transform: {
    '^.+\\.[tj]s?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!nanoid)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^nanoid$': '<rootDir>/src/__mocks__/nanoid.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
}
