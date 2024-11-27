import { Application } from 'express';
import { AuthController } from '../controllers/authController';
import { EmporiaController } from '../controllers/emporiaController';
import { DevicesController } from '../controllers/devicesController';
import { authenticate } from '../middleware/authenticate';

export function setupRoutes(app: Application) {
  const authController = new AuthController();
  const emporiaController = new EmporiaController();
  const devicesController = new DevicesController();

  // Auth routes (Public)
  app.post('/signup', authController.signup.bind(authController));
  app.post('/login', authController.login.bind(authController));

  // Middleware to protect the following routes
  app.use(authenticate);

  // Auth routes (Protected)
  app.get('/me', authController.getMe.bind(authController));

  // Emporia routes (Protected)
  app.post('/emporia-auth', emporiaController.authenticateUser.bind(emporiaController));

  // Device routes (Protected)
  app.get('/devices', devicesController.getUserDevices.bind(devicesController));
}
