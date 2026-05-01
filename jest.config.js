export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/config/**'],
    reporters: ['default', './jest-table-reporter.js'],
};
