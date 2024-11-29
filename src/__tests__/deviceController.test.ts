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

  describe('getChartUsage', () => {
    let deviceGid: number;

    beforeAll(async () => {
      // Fetch the deviceGid for testing
      const devicesResponse = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${token}`);
      deviceGid = devicesResponse.body.devices[0].deviceGid;
    });

    it('should return chart usage data for a valid user and device', async () => {
      const response = await request(app)
        .get(`/devices/${deviceGid}/history`)
        .query({
          channels: [1],
          start: new Date(Date.UTC(2023, 1, 1, 0, 0, 0)).toISOString(),
          end: new Date(Date.UTC(2023, 1, 31, 23, 0, 0, 0)).toISOString(),
          scale: '1H',
          energyUnit: 'KilowattHours',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usageList');
      expect(response.body).toHaveProperty('firstUsageInstant');
    });

    it('should return 400 if required query parameters are missing', async () => {
      const response = await request(app)
        .get(`/devices/${deviceGid}/history`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters.');
    });

    it('should return 400 if date format is invalid', async () => {
      const response = await request(app)
        .get(`/devices/${deviceGid}/history`)
        .query({
          channels: [1],
          start: 'invalid-date',
          end: 'invalid-date',
          scale: '1H',
          energyUnit: 'KilowattHours',
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid date format for start or end.');
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('getUserDevices', () => {
    it('should return the list of devices for a valid user', async () => {
      const response = await request(app).get(`/devices`).set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('customerGid');
      expect(response.body).toHaveProperty('devices');
      expect(response.body.devices.length).toBeGreaterThan(0);
      expect(response.body.devices[0]).toHaveProperty('deviceGid');
    });
  });
});
