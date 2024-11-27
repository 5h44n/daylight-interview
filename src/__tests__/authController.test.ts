import request from 'supertest';
import app from '../index';
import { initializeDatabase, sequelize } from '../database';
import { User } from '../models/user';

describe('AuthController', () => {
  beforeAll(async () => {
    await initializeDatabase();

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /signup', () => {
    it('should successfully register a new user', async () => {
      const response = await request(app).post('/signup').send({
        email: 'testuser@example.com',
        password: 'TestPass123',
        emporiaUsername: 'test_emp',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('testuser@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail to register a user with an existing email', async () => {
      // Create a user
      await User.create({
        email: 'duplicate@example.com',
        password: 'OriginalPass123',
        emporiaUsername: 'original_emp',
      });

      // Attempt to register with the same email
      const response = await request(app).post('/signup').send({
        email: 'duplicate@example.com',
        password: 'NewPass456',
        emporiaUsername: 'new_emp',
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'User with this email already exists.');
    });

    it('should fail to register without email and password', async () => {
      const response = await request(app).post('/signup').send({
        emporiaUsername: 'no_email_pass',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email and password are required.');
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Create a user to login with
      await request(app).post('/signup').send({
        email: 'loginuser@example.com',
        password: 'LoginPass123',
        emporiaUsername: 'login_emp',
      });
    });

    it('should successfully login with correct credentials', async () => {
      const response = await request(app).post('/login').send({
        email: 'loginuser@example.com',
        password: 'LoginPass123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app).post('/login').send({
        email: 'loginuser@example.com',
        password: 'WrongPass456',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password.');
    });

    it('should fail to login with non-existing email', async () => {
      const response = await request(app).post('/login').send({
        email: 'nonexistent@example.com',
        password: 'SomePass789',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password.');
    });

    it('should fail to login without email and password', async () => {
      const response = await request(app).post('/login').send({
        emporiaUsername: 'no_login',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email and password are required.');
    });
  });

  describe('GET /me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // Create a new user and obtain JWT token
      const signupResponse = await request(app).post('/signup').send({
        email: 'meuser@example.com',
        password: 'MePass123',
        emporiaUsername: 'me_emp',
      });

      userId = signupResponse.body.user.id;

      const loginResponse = await request(app).post('/login').send({
        email: 'meuser@example.com',
        password: 'MePass123',
      });

      token = loginResponse.body.token;
    });

    it("should retrieve the authenticated user's information", async () => {
      const response = await request(app).get('/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('meuser@example.com');
      expect(response.body.user).toHaveProperty('id', userId);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authorization header missing.');
    });

    it('should return 403 if an invalid token is provided', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app).get('/me').set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token.');
    });

    it('should return 404 if the user does not exist', async () => {
      // Delete the user from the database
      await User.destroy({ where: { id: userId } });

      const response = await request(app).get('/me').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found.');
    });
  });
});
