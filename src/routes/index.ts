import { Application } from 'express';
import { UserController } from '../controllers/userController';
import { EmporiaController } from '../controllers/emporiaController';

export function setupRoutes(app: Application) {
  const userController = new UserController();
  const emporiaController = new EmporiaController();

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
}
