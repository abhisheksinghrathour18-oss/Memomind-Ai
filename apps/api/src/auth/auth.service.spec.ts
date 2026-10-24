import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;

  beforeEach(() => {
    mockUsersService = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock.jwt.token'),
    };

    authService = new AuthService(
      mockUsersService as UsersService,
      mockJwtService as JwtService,
    );
  });

  describe('Registration', () => {
    it('1. Successfully registers a new user with hashed password', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(null);
      vi.mocked(mockUsersService.create!).mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date('2026-10-23T12:00:00Z'),
        updatedAt: new Date('2026-10-23T12:00:00Z'),
      });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      expect(result.user.id).toBe('user-uuid-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock.jwt.token');
      // Password hash must never leak in result
      expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('2. Throws ConflictException on duplicate email registration', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'existing-id',
        email: 'duplicate@example.com',
        name: 'Existing',
        passwordHash: 'some-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          email: 'duplicate@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Login', () => {
    it('3. Successfully logs in with correct credentials', async () => {
      const plainPassword = 'CorrectPassword123';
      const passwordHash = await argon2.hash(plainPassword, { type: argon2.argon2id });

      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'user-uuid-2',
        email: 'login@example.com',
        name: 'Login User',
        passwordHash,
        createdAt: new Date('2026-10-23T12:00:00Z'),
        updatedAt: new Date('2026-10-23T12:00:00Z'),
      });

      const result = await authService.login({
        email: 'login@example.com',
        password: plainPassword,
      });

      expect(result.user.email).toBe('login@example.com');
      expect(result.token).toBe('mock.jwt.token');
    });

    it('4. Throws UnauthorizedException on invalid password', async () => {
      const passwordHash = await argon2.hash('RealPassword123', { type: argon2.argon2id });

      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'user-uuid-3',
        email: 'wrongpass@example.com',
        name: 'User',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'wrongpass@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('5. Throws UnauthorizedException when user does not exist', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
