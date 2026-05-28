module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
  testTimeout: 60000,
}
