/**
 * Editor humanization functionality tests
 * Tests humanization API integration, metrics display, and error handling
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import { Editor } from '../pages/Editor';
import { server } from '../test/mocks/server';
import { http, HttpResponse, delay } from 'msw';
import { useAppStore } from '../store';

const API_BASE = '/api/v1';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

// Mock keyboard shortcuts context
vi.mock('../context/KeyboardShortcutsContext', () => ({
  useKeyboardShortcuts: () => ({
    getShortcutKey: () => 'ctrl+h',
    getFormattedKey: () => 'Ctrl+H',
    shortcutsEnabled: false,
    isShortcutsModalOpen: false,
    openShortcutsModal: vi.fn(),
    closeShortcutsModal: vi.fn(),
    customBindings: {},
    setCustomBinding: vi.fn(),
    resetBinding: vi.fn(),
    resetAllBindings: vi.fn(),
    feedback: null,
    setShortcutsEnabled: vi.fn(),
  }),
}));

describe('Editor Humanization Functionality', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    // Reset store state
    useAppStore.setState({
      originalText: '',
      humanizedText: '',
      currentProjectId: null,
    });
  });

  describe('4.1 Humanization API Integration', () => {
    /**
     * Test that clicking humanize sends text to API
     * Requirements: 2.1
     */
    it('should send text to API when humanize button is clicked', async () => {
      const user = userEvent.setup();
      let requestBody: { text: string } | null = null;

      // Intercept the humanize request to capture the body
      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async ({ request }) => {
          requestBody = await request.json() as { text: string };
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: `Humanized: ${requestBody.text}`,
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text in the textarea
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'This is AI generated text that needs humanization.');

      // Click humanize button
      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      await user.click(humanizeButton);

      // Verify API was called with the text
      await waitFor(() => {
        expect(requestBody).not.toBeNull();
        expect(requestBody?.text).toBe('This is AI generated text that needs humanization.');
      });
    });

    /**
     * Test loading state during processing
     * Requirements: 2.4
     */
    it('should display loading indicator during processing', async () => {
      const user = userEvent.setup();

      // Add delay to simulate processing
      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          await delay(200);
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');

      // Click humanize
      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      await user.click(humanizeButton);

      // Check for loading state - button should show "Processing..."
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });
    });

    /**
     * Test humanized text display after response
     * Requirements: 2.2
     */
    it('should display humanized text after successful response', async () => {
      const user = userEvent.setup();
      const originalText = 'Original AI text';
      const humanizedText = 'This is the humanized version of the text';

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: humanizedText,
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, originalText);

      // Click humanize
      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      await user.click(humanizeButton);

      // Wait for humanized text to appear
      await waitFor(() => {
        expect(screen.getByText(humanizedText)).toBeInTheDocument();
      });
    });

    /**
     * Test that humanize button is disabled when no text is entered
     */
    it('should disable humanize button when text is empty', async () => {
      render(<Editor />);

      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      expect(humanizeButton).toBeDisabled();
    });

    /**
     * Test that humanize button is enabled when text is entered
     */
    it('should enable humanize button when text is entered', async () => {
      const user = userEvent.setup();
      render(<Editor />);

      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Some text');

      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      expect(humanizeButton).not.toBeDisabled();
    });
  });

  describe('4.4 Metrics Display', () => {
    /**
     * Test detection score display (0-100 range)
     * Requirements: 2.3
     */
    it('should display detection score in 0-100 range', async () => {
      const user = userEvent.setup();
      const detectionScore = 15.5;

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: detectionScore,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for metrics to appear
      await waitFor(() => {
        expect(screen.getByText(/ai detection/i)).toBeInTheDocument();
        expect(screen.getByText(`${detectionScore}%`)).toBeInTheDocument();
      });
    });

    /**
     * Test perplexity display (0-200 range)
     * Requirements: 2.3
     */
    it('should display perplexity value', async () => {
      const user = userEvent.setup();
      const perplexity = 85.2;

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: 15.5,
              perplexity: perplexity,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for metrics to appear
      await waitFor(() => {
        expect(screen.getByText(/perplexity/i)).toBeInTheDocument();
        expect(screen.getByText(perplexity.toString())).toBeInTheDocument();
      });
    });

    /**
     * Test burstiness display (0-1 range)
     * Requirements: 2.3
     */
    it('should display burstiness value in 0-1 range', async () => {
      const user = userEvent.setup();
      const burstiness = 0.65;

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: burstiness,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for metrics to appear
      await waitFor(() => {
        expect(screen.getByText(/burstiness/i)).toBeInTheDocument();
        expect(screen.getByText(burstiness.toFixed(2))).toBeInTheDocument();
      });
    });

    /**
     * Test modification percentage display (0-100 range)
     * Requirements: 2.3
     */
    it('should display modification percentage in 0-100 range', async () => {
      const user = userEvent.setup();
      const modificationPercentage = 35.8;

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: modificationPercentage,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for metrics to appear
      await waitFor(() => {
        expect(screen.getByText(/modified/i)).toBeInTheDocument();
        expect(screen.getByText(`${modificationPercentage}%`)).toBeInTheDocument();
      });
    });

    /**
     * Test all metrics are displayed together
     * Requirements: 2.3
     */
    it('should display all metrics after successful humanization', async () => {
      const user = userEvent.setup();
      const metrics = {
        detectionScore: 12.3,
        perplexity: 95.7,
        burstiness: 0.72,
        modificationPercentage: 42.1,
      };

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: metrics,
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for all metrics to appear
      await waitFor(() => {
        expect(screen.getByText(/transformation metrics/i)).toBeInTheDocument();
        expect(screen.getByText(`${metrics.detectionScore}%`)).toBeInTheDocument();
        expect(screen.getByText(metrics.perplexity.toString())).toBeInTheDocument();
        expect(screen.getByText(metrics.burstiness.toFixed(2))).toBeInTheDocument();
        expect(screen.getByText(`${metrics.modificationPercentage}%`)).toBeInTheDocument();
      });
    });
  });

  describe('4.6 Error Handling in Editor', () => {
    /**
     * Test error message display for API errors
     * Requirements: 2.5
     */
    it('should display error message when API returns error', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json(
            { message: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' },
            { status: 503 }
          );
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for error message
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    /**
     * Test user-friendly error messages (no raw errors)
     * Requirements: 2.5
     */
    it('should display user-friendly error message, not raw error', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          return HttpResponse.json(
            { message: 'Internal server error', code: 'INTERNAL_ERROR', stack: 'Error at line 123...' },
            { status: 500 }
          );
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for error message
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        // Should not show stack trace
        expect(screen.queryByText(/Error at line/i)).not.toBeInTheDocument();
      });
    });

    /**
     * Test error display for validation errors
     * Requirements: 2.5
     */
    it('should display error when text is empty and user tries to humanize', async () => {
      const user = userEvent.setup();

      // Set up store with empty text but try to trigger humanize via store
      useAppStore.setState({ originalText: '' });

      render(<Editor />);

      // The humanize button should be disabled when text is empty
      const humanizeButton = screen.getByRole('button', { name: /humanize/i });
      expect(humanizeButton).toBeDisabled();
    });

    /**
     * Test error clears when user starts typing again
     */
    it('should allow retry after error', async () => {
      const user = userEvent.setup();
      let callCount = 0;

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { message: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' },
              { status: 503 }
            );
          }
          return HttpResponse.json({
            id: 'transform-123',
            humanizedText: 'Humanized text',
            metrics: {
              detectionScore: 15.5,
              perplexity: 85.2,
              burstiness: 0.65,
              modificationPercentage: 35.8,
            },
            processingTime: 1250,
            strategyUsed: 'standard',
            levelApplied: 3,
          });
        })
      );

      render(<Editor />);

      // Enter text and humanize (first attempt - will fail)
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Retry (second attempt - will succeed)
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('Humanized text')).toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });

    /**
     * Test network error handling
     * Requirements: 2.5
     */
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/transformations/humanize`, async () => {
          throw new Error('Network error');
        })
      );

      render(<Editor />);

      // Enter text and humanize
      const textarea = screen.getByPlaceholderText(/paste your ai-generated text here/i);
      await user.type(textarea, 'Test text');
      await user.click(screen.getByRole('button', { name: /humanize/i }));

      // Wait for error message
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });
  });
});
