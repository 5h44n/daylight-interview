import request from 'supertest';
import app from '../index';
import { EmporiaService } from '../services/emporiaService';
import { User } from '../models/user';
import { initializeDatabase, sequelize } from '../database';
import { generateToken } from './utils/generateToken';
import dotenv from 'dotenv';

dotenv.config();

describe('EmporiaController Tests', () => {
  let testUser: User;
  let emporiaService: EmporiaService; // eslint-disable-line @typescript-eslint/no-unused-vars
  let token: string;

  beforeAll(async () => {
    if (!process.env.EMPORIA_USERNAME || !process.env.EMPORIA_PASSWORD) {
      throw new Error('EMPORIA_USERNAME and EMPORIA_PASSWORD environment variables are required');
    }

    jest.spyOn(console, 'error').mockImplementation(() => {});

    emporiaService = new EmporiaService();

    await initializeDatabase();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
    testUser = await User.create({ email: 'bruce@wayne.com', password: 'password' });
    token = generateToken(testUser);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('authenticateUser', () => {
    it('should authenticate a user successfully', async () => {
      const response = await request(app)
        .post(`/emporia-auth`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emporiaUsername: process.env.EMPORIA_USERNAME,
          emporiaPassword: process.env.EMPORIA_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Emporia authentication successful' });

      const updatedUser = await User.findByPk(testUser.id);

      expect(updatedUser?.emporiaUsername).toBe(process.env.EMPORIA_USERNAME);
      expect(updatedUser?.emporiaIdToken).toBeTruthy();
      expect(updatedUser?.emporiaRefreshToken).toBeTruthy();
      expect(updatedUser?.emporiaIdTokenExpiresAt).toBeTruthy();
    });

    it('should return 400 if request body is invalid', async () => {
      const response = await request(app)
        .post(`/emporia-auth`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emporiaUsername: process.env.EMPORIA_USERNAME,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required credentials' });

      const response2 = await request(app)
        .post(`/emporia-auth`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emporiaPassword: process.env.EMPORIA_PASSWORD,
        });

      expect(response2.status).toBe(400);
      expect(response2.body).toEqual({ error: 'Missing required credentials' });
    });

    it('should return 400 if credentials are invalid', async () => {
      const response = await request(app)
        .post(`/emporia-auth`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emporiaUsername: 'invalid',
          emporiaPassword: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Emporia authentication failed' });

      const updatedUser = await User.findByPk(testUser.id);

      expect(updatedUser?.emporiaIdToken).toBeNull();
      expect(updatedUser?.emporiaRefreshToken).toBeNull();
      expect(updatedUser?.emporiaIdTokenExpiresAt).toBeNull();
    });
  });
});
