import { Application } from 'express';
import { UserController } from '../controllers/userController';
import { EmporiaController } from '../controllers/emporiaController';
import { DevicesController } from '../controllers/devicesController';

export function setupRoutes(app: Application) {
  const userController = new UserController();
  const emporiaController = new EmporiaController();
  const devicesController = new DevicesController();

  // User routes
  app.post('/users', userController.createUser.bind(userController));
  app.get('/users', userController.getUsers.bind(userController));
  app.get('/users/:id', userController.getUser.bind(userController));

  // Emporia routes
  app.post('/users/:id/emporia-auth', emporiaController.authenticateUser.bind(emporiaController));
  app.get(
    '/users/:id/emporia-customer',
    emporiaController.getCustomerDetails.bind(emporiaController)
  );

  // Device routes
  app.get('/users/:id/devices', devicesController.getUserDevices.bind(devicesController));
}
