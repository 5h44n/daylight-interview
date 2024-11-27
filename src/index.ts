import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initializeDatabase } from './database';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';

const app = express();
const port = process.env.PORT || 3000;

// JSON Middleware
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Setup routes
setupRoutes(app);

// Setup WebSocket handlers
setupWebSocket(wss);

// Initialize database
initializeDatabase()
  .then(() => {
    if (require.main === module) {
      server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    }
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

export default app;
