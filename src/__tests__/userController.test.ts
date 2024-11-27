import request from 'supertest';
import app from '../index';
import { User } from '../models/models';
import { initializeDatabase, sequelize } from '../models';
import { UserController } from '../controllers/userController';

describe('UserController Integration Tests', () => {
  let userController: UserController; // eslint-disable-line @typescript-eslint/no-unused-vars

  beforeAll(async () => {
    userController = new UserController();
    await initializeDatabase();
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /users', () => {
    test('should return all users', async () => {
      // Create users
      await User.create({ email: 'bruce@wayne.com' });
      await User.create({ email: 'dick@wayne.com ' });

      // Retrieve users
      const response = await request(app).get('/users');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /users/:id', () => {
    test('should return a user by id', async () => {
      const user = await User.create({ email: 'bruce@wayne.com' });
      const response = await request(app).get(`/users/${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe(user.email);
    });

    test('should return 404 if user is not found', async () => {
      const response = await request(app).get('/users/1');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /users', () => {
    test('should create a user', async () => {
      const response = await request(app).post('/users').send({ email: 'bruce@wayne.com' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeTruthy();
      expect(response.body.email).toBe('bruce@wayne.com');
    });

    test('should return 400 if email is missing', async () => {
      const response = await request(app).post('/users').send({});

      expect(response.status).toBe(400);
    });
  });
});
