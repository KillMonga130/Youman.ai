/**
 * Authentication Module Tests
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
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

  /**
   * Property-Based Tests
   * Feature: ai-humanizer, Property 20: API authentication
   * Validates: Requirements 7.1
   * 
   * Property: For any valid user credentials (userId, email, sessionId),
   * generating a JWT token and verifying it should return the same credentials.
   * For any arbitrary string that is not a valid JWT, verification should fail.
   */
  describe('Property-Based Tests', () => {
    // Feature: ai-humanizer, Property 20: API authentication
    // Validates: Requirements 7.1
    describe('Property 20: API authentication', () => {
      it('should authenticate valid tokens and return correct user data for any valid credentials', () => {
        fc.assert(
          fc.property(
            // Generate valid user credentials
            fc.record({
              userId: fc.uuid(),
              email: fc.emailAddress(),
              sessionId: fc.uuid(),
            }),
            ({ userId, email, sessionId }) => {
              // Generate tokens with the credentials
              const tokens = generateTokens(userId, email, sessionId);
              
              // Verify access token returns correct payload
              const accessPayload = verifyToken(tokens.accessToken);
              expect(accessPayload).not.toBeNull();
              expect(accessPayload?.userId).toBe(userId);
              expect(accessPayload?.email).toBe(email);
              expect(accessPayload?.sessionId).toBe(sessionId);
              expect(accessPayload?.type).toBe('access');
              
              // Verify refresh token returns correct payload
              const refreshPayload = verifyToken(tokens.refreshToken);
              expect(refreshPayload).not.toBeNull();
              expect(refreshPayload?.userId).toBe(userId);
              expect(refreshPayload?.email).toBe(email);
              expect(refreshPayload?.sessionId).toBe(sessionId);
              expect(refreshPayload?.type).toBe('refresh');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject any arbitrary string that is not a valid JWT token', () => {
        fc.assert(
          fc.property(
            // Generate arbitrary strings that are not valid JWTs
            fc.string().filter((s) => {
              // Filter out strings that could accidentally be valid JWTs
              // Valid JWTs have 3 base64url-encoded parts separated by dots
              const parts = s.split('.');
              return parts.length !== 3;
            }),
            (invalidToken) => {
              // Verification should return null for invalid tokens
              const payload = verifyToken(invalidToken);
              expect(payload).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject tampered tokens', () => {
        fc.assert(
          fc.property(
            fc.record({
              userId: fc.uuid(),
              email: fc.emailAddress(),
              sessionId: fc.uuid(),
            }),
            fc.integer({ min: 0, max: 100 }),
            ({ userId, email, sessionId }, tamperPosition) => {
              // Generate a valid token
              const tokens = generateTokens(userId, email, sessionId);
              const originalToken = tokens.accessToken;
              
              // Tamper with the token by modifying a character
              if (originalToken.length > 0) {
                const position = tamperPosition % originalToken.length;
                const chars = originalToken.split('');
                // Change the character at the position
                chars[position] = chars[position] === 'a' ? 'b' : 'a';
                const tamperedToken = chars.join('');
                
                // If the token was actually modified, verification should fail
                if (tamperedToken !== originalToken) {
                  const payload = verifyToken(tamperedToken);
                  expect(payload).toBeNull();
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
