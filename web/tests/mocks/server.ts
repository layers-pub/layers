/**
 * MSW test server for Layers frontend tests.
 *
 * Import and start this server in test setup to intercept all API
 * requests with the default mock handlers.
 *
 * @module
 */

import { setupServer } from 'msw/node';

import { handlers } from './handlers';

const server = setupServer(...handlers);

export { server };
