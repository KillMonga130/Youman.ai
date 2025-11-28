/**
 * Authentication flow tests
 * Tests login, registration, and logout functionality
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import { Login } from '../pages/Login';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Authentication Flows', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Login Functionality', () => {
    /**
     * Test successful login with valid credentials
     * Requirements: 1.1
     */
    it('should authenticate user and redirect to dashboard on valid login', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Fill in login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for navigation to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      // Verify token is stored
      expect(localStorage.getItem('auth_token')).toBe('mock-access-token');
    });

    /**
     * Test error display for invalid credentials
     * Requirements: 1.2
     */
    it('should display error message for invalid credentials without redirecting', async () => {
      // Override the login handler to return a proper error without triggering token refresh
      server.use(
        http.post(`${API_BASE}/auth/login`, async () => {
          return HttpResponse.json(
            { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            { status: 401 }
          );
        })
      );

      const user = userEvent.setup();
      render(<Login />);

      // Fill in login form with invalid credentials
      await user.type(screen.getByLabelText(/email/i), 'invalid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for error message - the API client transforms the error
      await waitFor(() => {
        // Check for any error alert being displayed
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled();
      
      // Verify no token stored
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    /**
     * Test token storage after successful login
     * Requirements: 1.1
     */
    it('should store JWT token after successful login', async () => {
      const user = userEvent.setup();
      render(<Login />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeTruthy();
        expect(localStorage.getItem('refresh_token')).toBeTruthy();
      });
    });

    /**
     * Test loading state during login
     */
    it('should show loading state during login', async () => {
      // Add delay to login handler
      server.use(
        http.post(`${API_BASE}/auth/login`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            message: 'Login successful',
            user: { id: 'user-123', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
            tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
          });
        })
      );

      const user = userEvent.setup();
      render(<Login />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Check for loading state
      expect(screen.getByText(/please wait/i)).toBeInTheDocument();
    });
  });


  describe('Registration Functionality', () => {
    /**
     * Test successful registration with valid data
     * Requirements: 1.3
     */
    it('should create account and auto-login on valid registration', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Switch to registration mode
      await user.click(screen.getByText(/don't have an account/i));

      // Fill in registration form
      await user.type(screen.getByLabelText(/name/i), 'New User');
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Wait for navigation to dashboard (auto-login)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      // Verify token is stored (auto-login)
      expect(localStorage.getItem('auth_token')).toBeTruthy();
    });

    /**
     * Test error display for duplicate email
     * Requirements: 1.4
     */
    it('should display error for duplicate email registration', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Switch to registration mode
      await user.click(screen.getByText(/don't have an account/i));

      // Fill in registration form with existing email
      await user.type(screen.getByLabelText(/name/i), 'Existing User');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });

      // Verify no navigation occurred
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    /**
     * Test switching between login and registration modes
     */
    it('should toggle between login and registration forms', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Initially in login mode
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();

      // Switch to registration
      await user.click(screen.getByText(/don't have an account/i));
      
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();

      // Switch back to login
      await user.click(screen.getByText(/already have an account/i));
      
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    });

    /**
     * Test error clearing when switching modes
     */
    it('should clear error when switching between login and registration', async () => {
      // Override the login handler to return a proper error
      server.use(
        http.post(`${API_BASE}/auth/login`, async () => {
          return HttpResponse.json(
            { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
            { status: 401 }
          );
        })
      );

      const user = userEvent.setup();
      render(<Login />);

      // Trigger login error
      await user.type(screen.getByLabelText(/email/i), 'invalid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Check for error alert being displayed
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Switch to registration - error should be cleared
      await user.click(screen.getByText(/don't have an account/i));
      
      // Error alert should be gone
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    /**
     * Test token clearing on logout
     * Requirements: 1.5
     */
    it('should clear tokens on logout', async () => {
      // Set up initial authenticated state
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh-token');

      // Import and call logout directly from apiClient
      const { apiClient } = await import('../api/client');
      await apiClient.logout();

      // Verify tokens are cleared
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    /**
     * Test that logout clears the internal token state
     * Requirements: 1.5
     */
    it('should clear internal token state on logout', async () => {
      const { apiClient } = await import('../api/client');
      
      // Set token
      apiClient.setToken('test-token');
      expect(apiClient.getToken()).toBe('test-token');

      // Logout
      await apiClient.logout();

      // Token should be cleared
      expect(apiClient.getToken()).toBeNull();
    });
  });

  describe('Form Validation', () => {
    /**
     * Test that email field is required
     */
    it('should require email field', async () => {
      render(<Login />);
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('required');
    });

    /**
     * Test that password field is required
     */
    it('should require password field', async () => {
      render(<Login />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    /**
     * Test that name field is required in registration mode
     */
    it('should require name field in registration mode', async () => {
      const user = userEvent.setup();
      render(<Login />);

      // Switch to registration mode
      await user.click(screen.getByText(/don't have an account/i));
      
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('required');
    });
  });
});
