import { WebSocketServer, WebSocket } from 'ws';

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        console.log('Received:', data);
        
        ws.send(JSON.stringify({ type: 'echo', data }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // do nothing
    });
  });
}
