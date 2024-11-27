import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../routes';
import { User } from '../models/models';

jest.mock('../models/models', () => ({
  User: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

describe('REST API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupRoutes(app);
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      (User.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(User.findAll).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (User.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const newUser = { name: 'John', email: 'john@example.com' };
      (User.create as jest.Mock).mockResolvedValue({ id: 1, ...newUser });

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual({ id: 1, ...newUser });
      expect(User.create).toHaveBeenCalledWith(newUser);
    });

    it('should handle invalid requests', async () => {
      const invalidUser = { invalid: 'data' };
      (User.create as jest.Mock).mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid request' });
    });
  });
});
