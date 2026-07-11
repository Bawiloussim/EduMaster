module.exports = {
  testEnvironment: 'node',
  testTimeout: 20000,
  // uuid v14 ships as ESM-only; Node's native require(esm) support handles it fine in
  // production, but Jest's CJS module loader can't — stub it out for tests.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
};
