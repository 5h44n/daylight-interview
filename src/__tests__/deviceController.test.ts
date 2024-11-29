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

  describe('getInstantUsage', () => {
    let deviceGid: number;

    beforeAll(async () => {
      // Fetch a deviceGid for testing
      const devicesResponse = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${token}`);
      deviceGid = devicesResponse.body.devices[0].deviceGid;
    });

    it('should return instant usage data for specified devices', async () => {
      const instant = new Date().toISOString();
      const scale = '1MIN';
      const energyUnit = 'KilowattHours';

      const response = await request(app)
        .get(`/devices/instant`)
        .query({
          devices: [deviceGid],
          instant,
          scale,
          energyUnit,
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deviceListUsages).toBeDefined();
      expect(response.body.deviceListUsages.devices.length).toBeGreaterThan(0);
      expect(response.body.deviceListUsages.devices[0].deviceGid).toBe(deviceGid);
    });

    it('should return instant usage data for all user devices when no devices are specified', async () => {
      const instant = new Date().toISOString();
      const scale = '1MIN';
      const energyUnit = 'KilowattHours';

      const response = await request(app)
        .get(`/devices/instant`)
        .query({
          instant,
          scale,
          energyUnit,
        })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deviceListUsages).toBeDefined();
      expect(response.body.deviceListUsages.devices.length).toBeGreaterThan(0);
    });

    it('should return 400 if required query parameters are missing', async () => {
      const response = await request(app)
        .get(`/devices/instant`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required query parameters.');
    });

    it('should return 401 if authorization token is missing', async () => {
      const instant = new Date().toISOString();
      const scale = '1MIN';
      const energyUnit = 'KilowattHours';

      const response = await request(app).get(`/devices/instant`).query({
        instant,
        scale,
        energyUnit,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authorization header missing.');
    });
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
