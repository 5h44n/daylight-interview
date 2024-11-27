import request from 'supertest';
import app from '../index';
import { EmporiaService } from '../services/emporiaService';
import { User } from '../models/models';
import { initializeDatabase, sequelize } from '../models';
import dotenv from 'dotenv';

dotenv.config();

describe('EmporiaController Tests', () => {
  let testUser: User;
  let emporiaService: EmporiaService; // eslint-disable-line @typescript-eslint/no-unused-vars

  beforeAll(async () => {
    if (!process.env.EMPORIA_USERNAME || !process.env.EMPORIA_PASSWORD) {
      throw new Error('EMPORIA_USERNAME and EMPORIA_PASSWORD environment variables are required');
    }

    emporiaService = new EmporiaService();

    await initializeDatabase();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
    testUser = await User.create({ email: 'bruce@wayne.com' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('authenticateUser', () => {
    it('should authenticate a user successfully', async () => {
      const response = await request(app).post(`/users/${testUser.id}/emporia-auth`).send({
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

    it('should return 404 if user is not found', async () => {
      const response = await request(app).post('/users/nonexistent-id/emporia-auth').send({
        emporiaUsername: process.env.EMPORIA_USERNAME,
        emporiaPassword: process.env.EMPORIA_PASSWORD,
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should return 400 if request body is invalid', async () => {
      const response = await request(app).post(`/users/${testUser.id}/emporia-auth`).send({
        emporiaUsername: process.env.EMPORIA_USERNAME,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required credentials' });

      const response2 = await request(app).post(`/users/${testUser.id}/emporia-auth`).send({
        emporiaPassword: process.env.EMPORIA_PASSWORD,
      });

      expect(response2.status).toBe(400);
      expect(response2.body).toEqual({ error: 'Missing required credentials' });
    });

    it('should return 400 if credentials are invalid', async () => {
      const response = await request(app).post(`/users/${testUser.id}/emporia-auth`).send({
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

  describe('getCustomerDetails', () => {
    it('should get customer details successfully', async () => {
      // Authenticate the user
      await request(app).post(`/users/${testUser.id}/emporia-auth`).send({
        emporiaUsername: process.env.EMPORIA_USERNAME,
        emporiaPassword: process.env.EMPORIA_PASSWORD,
      });

      const response = await request(app).get(`/users/${testUser.id}/emporia-customer`);

      expect(response.status).toBe(200);
      expect(response.body.customerGid).toBeTruthy();
      expect(response.body.email).toBeTruthy();
      expect(response.body.firstName).toBeTruthy();
      expect(response.body.lastName).toBeTruthy();
      expect(response.body.createdAt).toBeTruthy();
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app).get('/users/nonexistent-id/emporia-customer');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should return 400 if user lacks valid Emporia credentials', async () => {
      const response = await request(app).get(`/users/${testUser.id}/emporia-customer`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Failed to fetch customer details' });
    });
  });
});
