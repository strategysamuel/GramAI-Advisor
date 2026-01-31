// Authentication service tests
import { authService, JWTPayload } from '../../shared/middleware/auth';

describe('AuthService', () => {
  const mockPayload: JWTPayload = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phoneNumber: '+919876543210',
    role: 'farmer',
  };

  describe('Token Generation', () => {
    test('should generate access token', () => {
      const token = authService.generateAccessToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate refresh token', () => {
      const token = authService.generateRefreshToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should generate token pair', () => {
      const tokens = authService.generateTokenPair(mockPayload);
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('Token Verification', () => {
    test('should verify valid access token', () => {
      const token = authService.generateAccessToken(mockPayload);
      const decoded = authService.verifyAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.phoneNumber).toBe(mockPayload.phoneNumber);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should verify valid refresh token', () => {
      const token = authService.generateRefreshToken(mockPayload);
      const decoded = authService.verifyRefreshToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.phoneNumber).toBe(mockPayload.phoneNumber);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid token');
    });

    test('should throw error for empty token', () => {
      expect(() => {
        authService.verifyAccessToken('');
      }).toThrow();
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token with valid refresh token', () => {
      const refreshToken = authService.generateRefreshToken(mockPayload);
      const newTokens = authService.refreshAccessToken(refreshToken);
      
      expect(newTokens).toBeDefined();
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      
      // Verify new access token contains correct payload
      const decoded = authService.verifyAccessToken(newTokens.accessToken);
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.phoneNumber).toBe(mockPayload.phoneNumber);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should throw error for invalid refresh token', () => {
      expect(() => {
        authService.refreshAccessToken('invalid-refresh-token');
      }).toThrow();
    });
  });
});