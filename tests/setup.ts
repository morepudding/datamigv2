import { jest } from '@jest/globals';

// Setup global pour les tests
global.console = {
  ...console,
  // Supprimer les logs pendant les tests (optionnel)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
