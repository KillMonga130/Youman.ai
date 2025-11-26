/**
 * Authentication Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,
} from './auth.service';
import { registerSchema, loginSchema } from './types';

describe('Authentication Module', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify a correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access and refresh tokens', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const sessionId = 'test-session-id';
      
      const tokens = generateTokens(userId, email, sessionId);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes in seconds
    });


    it('should verify a valid access token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const sessionId = 'test-session-id';
      
      const tokens = generateTokens(userId, email, sessionId);
      const payload = verifyToken(tokens.accessToken);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.sessionId).toBe(sessionId);
      expect(payload?.type).toBe('access');
    });

    it('should verify a valid refresh token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const sessionId = 'test-session-id';
      
      const tokens = generateTokens(userId, email, sessionId);
      const payload = verifyToken(tokens.refreshToken);
      
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.sessionId).toBe(sessionId);
      expect(payload?.type).toBe('refresh');
    });

    it('should return null for an invalid token', () => {
      const payload = verifyToken('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('Input Validation', () => {
    describe('Register Schema', () => {
      it('should accept valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Doe',
        };
        
        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'Password123',
        };
        
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject weak password (too short)', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Pass1',
        };
        
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject password without uppercase', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'password123',
        };
        
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject password without lowercase', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'PASSWORD123',
        };
        
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject password without number', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'PasswordABC',
        };
        
        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('Login Schema', () => {
      it('should accept valid login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword',
        };
        
        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'anypassword',
        };
        
        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject empty password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: '',
        };
        
        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });
});
