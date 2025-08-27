/** @type {import('jest').Config} */
const config = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Configuration TypeScript avec ts-jest
  preset: 'ts-jest',
  
  // Extensions de fichiers à traiter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Patterns de fichiers de test
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).(ts|js)'
  ],
  
  // Transformation des fichiers
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Chemins de modules (pour les imports absolus)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/lib/utils/$1',
    '^@/processors/(.*)$': '<rootDir>/src/lib/processors/$1'
  },
  
  // Répertoires à ignorer
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  
  // Couverture de code - exclure les fichiers React
  collectCoverage: true,
  collectCoverageFrom: [
    'src/lib/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/app/**/*',
    '!src/components/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup des tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Timeout des tests
  testTimeout: 30000,
  
  // Variables d'environnement
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  
  // Verbose pour plus de détails
  verbose: true
};

module.exports = config;
