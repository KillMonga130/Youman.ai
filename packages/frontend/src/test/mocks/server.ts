/**
 * MSW server setup for Node.js test environment
 * This server intercepts API requests during tests
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server with default handlers
export const server = setupServer(...handlers);

// Export for use in tests that need to add custom handlers
export { handlers };
