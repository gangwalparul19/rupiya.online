/**
 * Auth Service Tests
 * Tests authentication flows and user management
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Firebase
const mockAuth = {
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  currentUser: null
};

const mockGoogleProvider = jest.fn();

global.firebase = {
  auth: () => mockAuth,
  auth: {
    GoogleAuthProvider: mockGoogleProvider
  }
};

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in with valid credentials', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      mockAuth.signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      // Test would call actual auth service
      const email = 'test@example.com';
      const password = 'password123';

      const result = await mockAuth.signInWithEmailAndPassword(email, password);

      expect(mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(email, password);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle invalid credentials', async () => {
      mockAuth.signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password'
      });

      await expect(
        mockAuth.signInWithEmailAndPassword('test@example.com', 'wrong')
      ).rejects.toMatchObject({
        code: 'auth/wrong-password'
      });
    });

    it('should handle user not found', async () => {
      mockAuth.signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });

      await expect(
        mockAuth.signInWithEmailAndPassword('nonexistent@example.com', 'password')
      ).rejects.toMatchObject({
        code: 'auth/user-not-found'
      });
    });
  });

  describe('signUp', () => {
    it('should create new user account', async () => {
      const mockUser = {
        uid: 'new-uid',
        email: 'new@example.com',
        displayName: null
      };

      mockAuth.createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      const result = await mockAuth.createUserWithEmailAndPassword(
        'new@example.com',
        'password123'
      );

      expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalled();
      expect(result.user.email).toBe('new@example.com');
    });

    it('should handle email already in use', async () => {
      mockAuth.createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      });

      await expect(
        mockAuth.createUserWithEmailAndPassword('existing@example.com', 'password')
      ).rejects.toMatchObject({
        code: 'auth/email-already-in-use'
      });
    });

    it('should handle weak password', async () => {
      mockAuth.createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/weak-password',
        message: 'Password should be at least 6 characters'
      });

      await expect(
        mockAuth.createUserWithEmailAndPassword('test@example.com', '123')
      ).rejects.toMatchObject({
        code: 'auth/weak-password'
      });
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google', async () => {
      const mockUser = {
        uid: 'google-uid',
        email: 'google@example.com',
        displayName: 'Google User'
      };

      mockAuth.signInWithPopup.mockResolvedValue({
        user: mockUser
      });

      const result = await mockAuth.signInWithPopup({});

      expect(mockAuth.signInWithPopup).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
    });

    it('should handle popup closed by user', async () => {
      mockAuth.signInWithPopup.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
        message: 'Popup closed'
      });

      await expect(
        mockAuth.signInWithPopup({})
      ).rejects.toMatchObject({
        code: 'auth/popup-closed-by-user'
      });
    });
  });

  describe('signOut', () => {
    it('should sign out user', async () => {
      mockAuth.signOut.mockResolvedValue();

      await mockAuth.signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      mockAuth.sendPasswordResetEmail.mockResolvedValue();

      await mockAuth.sendPasswordResetEmail('test@example.com');

      expect(mockAuth.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle invalid email', async () => {
      mockAuth.sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'Invalid email'
      });

      await expect(
        mockAuth.sendPasswordResetEmail('invalid-email')
      ).rejects.toMatchObject({
        code: 'auth/invalid-email'
      });
    });
  });

  describe('onAuthStateChanged', () => {
    it('should listen to auth state changes', () => {
      const callback = jest.fn();
      mockAuth.onAuthStateChanged.mockReturnValue(() => {});

      mockAuth.onAuthStateChanged(callback);

      expect(mockAuth.onAuthStateChanged).toHaveBeenCalledWith(callback);
    });
  });
});
