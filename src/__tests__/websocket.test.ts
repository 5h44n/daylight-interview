import { WebSocket, WebSocketServer } from 'ws';
import { setupWebSocket } from '../websocket';
import { AddressInfo } from 'net';
import { createServer } from 'http';

describe('WebSocket Server', () => {
  let wss: WebSocketServer;
  let server: ReturnType<typeof createServer>;
  let wsClient: WebSocket;
  const PORT = 0;

  beforeEach((done) => {
    server = createServer();
    wss = new WebSocketServer({ server });
    setupWebSocket(wss);
    server.listen(PORT, () => {
      const port = (server.address() as AddressInfo).port;
      wsClient = new WebSocket(`ws://localhost:${port}`);
      wsClient.on('open', () => {
        done();
      });
    });
  });

  afterEach((done) => {
    wsClient.close();
    server.close(() => {
      done();
    });
  });

  it('should echo back the message', (done) => {
    const testMessage = { type: 'test', content: 'Hello' };

    wsClient.on('message', (message: Buffer) => {
      const response = JSON.parse(message.toString());
      expect(response).toEqual({
        type: 'echo',
        data: testMessage,
      });
      done();
    });

    wsClient.send(JSON.stringify(testMessage));
  });

  it('should handle invalid JSON messages', (done) => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    wsClient.send('invalid json');

    // Give some time for the error to be logged
    setTimeout(() => {
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      done();
    }, 100);
  });
});
