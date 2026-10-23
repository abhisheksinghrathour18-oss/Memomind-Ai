import { describe, it, expect } from 'vitest';
import { PrismaClient } from './index.js';

describe('Database client module', () => {
  it('exports PrismaClient constructor', () => {
    expect(PrismaClient).toBeDefined();
    expect(typeof PrismaClient).toBe('function');
  });
});

