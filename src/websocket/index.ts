import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { EmporiaService } from '../services/emporiaService';
import { EmporiaCustomerDevices } from '../interfaces/emporiaInterfaces';
import dotenv from 'dotenv';

dotenv.config();

export function setupWebSocket(wss: WebSocketServer) {
  const emporiaService = new EmporiaService();

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    // Initialize properties on the WebSocket
    (ws as any).isAuthenticated = false;
    (ws as any).userId = null;
    (ws as any).user = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'authenticate') {
          const token = data.token;
          if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication token missing.' }));
            ws.close();
            return;
          }

          // Verify JWT token
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string };
            const userId = decoded.sub;
            const user = await User.findByPk(userId);

            if (!user) {
              ws.send(JSON.stringify({ type: 'error', message: 'User not found.' }));
              ws.close();
              return;
            }

            (ws as any).isAuthenticated = true;
            (ws as any).userId = userId;
            (ws as any).user = user;

            ws.send(
              JSON.stringify({ type: 'authenticated', message: 'Authentication successful.' })
            );

            // Start streaming data
            startStreaming(ws, user);
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token.' }));
            ws.close();
          }
        } else if (!(ws as any).isAuthenticated) {
          ws.send(JSON.stringify({ type: 'error', message: 'Please authenticate first.' }));
        } else {
          // Handle other message types if needed
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
      }
    });

    ws.on('close', () => {
      // Clean up any resources if needed
      clearInterval((ws as any).streamInterval);
    });
  });

  function startStreaming(ws: WebSocket, user: User) {
    // Fetch devices associated with the user
    emporiaService
      .getCustomerDevices(user)
      .then(async (devicesData: EmporiaCustomerDevices) => {
        const deviceGids = devicesData.devices.map((device) => device.deviceGid);

        // Function to fetch and send data
        const fetchAndSendData = async () => {
          try {
            const instant = new Date().toISOString();
            const scale = '1MIN';
            const energyUnit = 'KilowattHours';

            const deviceListUsage = await emporiaService.getDeviceListUsages(
              user,
              deviceGids,
              instant,
              scale,
              energyUnit
            );

            ws.send(JSON.stringify({ type: 'deviceData', data: deviceListUsage }));
          } catch (error) {
            console.error('Error fetching device instant usage:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Error fetching device data.' }));
          }
        };

        // Fetch and send data immediately
        await fetchAndSendData();

        // Start periodic data fetching every minute
        const intervalId = setInterval(fetchAndSendData, 1000); // Fetch data every second

        // Store the interval ID on the WebSocket
        (ws as any).streamInterval = intervalId;
      })
      .catch((error) => {
        console.error('Error fetching user devices:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Error fetching devices.' }));
        ws.close();
      });
  }
}
