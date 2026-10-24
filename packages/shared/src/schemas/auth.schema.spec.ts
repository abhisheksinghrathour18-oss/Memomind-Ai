import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth.schema.js';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const input = {
        email: 'user@example.com',
        password: 'securePassword123',
        name: 'Jane Doe',
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('rejects passwords under 8 characters', () => {
      const input = {
        email: 'user@example.com',
        password: 'short',
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid emails', () => {
      const input = {
        email: 'not-an-email',
        password: 'securePassword123',
      };
      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login input', () => {
      const input = {
        email: 'user@example.com',
        password: 'anyPassword',
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const input = {
        email: 'user@example.com',
        password: '',
      };
      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
