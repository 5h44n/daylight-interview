import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../routes';
import { User } from '../models/models';
import { EmporiaService } from '../services/emporiaService';

jest.mock('../models/models', () => ({
  User: {
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../services/emporiaService', () => ({
  EmporiaService: {
    authenticate: jest.fn(),
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
        { id: 2, name: 'Jane' },
      ];

      (User.findAll as jest.Mock).mockResolvedValue(mockUsers);

      const response = await request(app).get('/users').expect('Content-Type', /json/).expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(User.findAll).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (User.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users').expect('Content-Type', /json/).expect(500);

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

  describe('POST /users/:id/emporia-auth', () => {
    it('should authenticate with Emporia and save tokens', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        update: jest.fn(),
      };
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (EmporiaService.authenticate as jest.Mock).mockResolvedValue(mockTokens);

      const response = await request(app)
        .post(`/users/${userId}/emporia-auth`)
        .send({
          emporiaUsername: 'test@example.com',
          emporiaPassword: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual({ message: 'Emporia authentication successful' });
      expect(mockUser.update).toHaveBeenCalledWith({
        emporiaAccessToken: mockTokens.accessToken,
        emporiaRefreshToken: mockTokens.refreshToken,
      });
    });

    it('should handle missing credentials', async () => {
      const response = await request(app).post('/users/123/emporia-auth').send({}).expect(400);

      expect(response.body).toEqual({ error: 'Missing required credentials' });
    });

    it('should handle user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/users/123/emporia-auth')
        .send({
          emporiaUsername: 'test@example.com',
          emporiaPassword: 'password123',
        })
        .expect(404);

      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should handle authentication failure', async () => {
      const mockUser = {
        id: '123',
        update: jest.fn(),
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (EmporiaService.authenticate as jest.Mock).mockRejectedValue(new Error('Auth failed'));

      const response = await request(app)
        .post('/users/123/emporia-auth')
        .send({
          emporiaUsername: 'test@example.com',
          emporiaPassword: 'password123',
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'Emporia authentication failed' });
    });
  });
});
