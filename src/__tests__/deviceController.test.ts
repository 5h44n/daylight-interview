import request from 'supertest';
import app from '../index';
import { User } from '../models/models';
import { initializeDatabase, sequelize } from '../models';
import dotenv from 'dotenv';
import { EmporiaService } from '../services/emporiaService';

dotenv.config();

describe('DevicesController Tests', () => {
  let emporiaService: EmporiaService;
  let authenticatedUser: User;

  beforeAll(async () => {
    await initializeDatabase();
    await sequelize.sync({ force: true });

    emporiaService = new EmporiaService();
    authenticatedUser = await User.create({ email: 'valid@user.com' });
    await emporiaService.authenticate(
      process.env.EMPORIA_USERNAME as string,
      process.env.EMPORIA_PASSWORD as string,
      authenticatedUser
    );
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('getUserDevices', () => {
    it('should return the list of devices for a valid user', async () => {
      const response = await request(app).get(`/users/${authenticatedUser.id}/devices`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customerGid');
      expect(response.body).toHaveProperty('devices');
      expect(response.body.devices.length).toBeGreaterThan(0);
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app).get('/users/nonexistent-id/devices');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });
  });
});
