import request from 'supertest';
import app from '../index';
import { User } from '../models/user';
import { initializeDatabase, sequelize } from '../database';
import dotenv from 'dotenv';
import { EmporiaService } from '../services/emporiaService';
import { generateToken } from './utils/generateToken';

dotenv.config();

describe('DevicesController Tests', () => {
  let emporiaService: EmporiaService;
  let authenticatedUser: User;
  let token: string;

  beforeAll(async () => {
    await initializeDatabase();
    await sequelize.sync({ force: true });

    emporiaService = new EmporiaService();
    authenticatedUser = await User.create({ email: 'valid@user.com', password: 'password' });
    token = generateToken(authenticatedUser);

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
      const response = await request(app)
        .get(`/users/${authenticatedUser.id}/devices`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customerGid');
      expect(response.body).toHaveProperty('devices');
      expect(response.body.devices.length).toBeGreaterThan(0);
    });

    it('should return 404 if user is not found', async () => {
      const response = await request(app)
        .get('/users/nonexistent-id/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });
  });
});
