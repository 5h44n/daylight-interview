import { WebSocket, WebSocketServer } from 'ws';
import { setupWebSocket } from '../websocket';
import { AddressInfo } from 'net';
import { createServer } from 'http';
import { generateToken } from './utils/generateToken';
import { EmporiaService } from '../services/emporiaService';
import { User } from '../models/user';
import { initializeDatabase, sequelize } from '../database';

describe('WebSocket Server', () => {
  let wss: WebSocketServer;
  let server: ReturnType<typeof createServer>;
  let wsClient: WebSocket;
  let testUser: User;
  let token: string;
  let emporiaService: EmporiaService;
  const PORT = 0; // server will assign port

  beforeEach(async () => {
    // Initialize database and create test user
    await initializeDatabase();
    await sequelize.sync({ force: true });

    testUser = await User.create({ email: 'testuser@example.com', password: 'password' });
    token = generateToken(testUser);

    // Authenticate user with Emporia service
    emporiaService = new EmporiaService();
    await emporiaService.authenticate(
      process.env.EMPORIA_USERNAME as string,
      process.env.EMPORIA_PASSWORD as string,
      testUser
    );

    server = createServer();
    wss = new WebSocketServer({ server });
    setupWebSocket(wss);

    await new Promise<void>((resolve) => {
      server.listen(PORT, () => {
        const port = (server.address() as AddressInfo).port;
        wsClient = new WebSocket(`ws://localhost:${port}`);
        wsClient.on('open', () => {
          resolve();
        });
      });
    });
  });

  afterEach(async () => {
    wsClient.close();
    await new Promise<void>((resolve) => {
      server.close(async () => {
        await sequelize.drop();
        resolve();
      });
    });
  });

  it('should authenticate and start receiving device data', (done) => {
    let authenticated = false;

    wsClient.on('message', (message: Buffer) => {
      const response = JSON.parse(message.toString());

      if (response.type === 'authenticated') {
        expect(response.message).toBe('Authentication successful.');
        authenticated = true;
      } else if (response.type === 'deviceData') {
        if (!authenticated) {
          done.fail('Received device data before authentication.');
        }
        expect(response.data.deviceListUsages).toBeDefined();
        expect(response.data.deviceListUsages.devices).toBeDefined();
        done();
      } else if (response.type === 'error') {
        done.fail(`Unexpected error: ${response.message}`);
      }
    });

    // Send authentication message
    wsClient.send(JSON.stringify({ type: 'authenticate', token }));
  });

  it('should send error and close connection on invalid token', (done) => {
    wsClient.on('message', (message: Buffer) => {
      const response = JSON.parse(message.toString());
      expect(response.type).toBe('error');
      expect(response.message).toBe('Invalid or expired token.');

      wsClient.on('close', () => {
        done();
      });
    });

    // Send invalid authentication message
    wsClient.send(JSON.stringify({ type: 'authenticate', token: 'invalidtoken' }));
  });

  it('should reject messages when not authenticated', (done) => {
    wsClient.on('message', (message: Buffer) => {
      const response = JSON.parse(message.toString());
      expect(response.type).toBe('error');
      expect(response.message).toBe('Please authenticate first.');
      done();
    });

    // Send a message without authenticating
    wsClient.send(JSON.stringify({ type: 'unknown', data: {} }));
  });
});
