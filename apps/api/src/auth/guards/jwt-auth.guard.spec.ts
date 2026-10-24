import { describe, it, expect } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('11. Throws UnauthorizedException when user is missing', () => {
    expect(() => {
      guard.handleRequest(null, null, null);
    }).toThrow(UnauthorizedException);
  });

  it('12. Throws UnauthorizedException when error is present', () => {
    expect(() => {
      guard.handleRequest(new Error('Token expired'), null, null);
    }).toThrow(UnauthorizedException);
  });

  it('13. Returns user object when authenticated', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const result = guard.handleRequest(null, mockUser, null);
    expect(result).toEqual(mockUser);
  });
});
