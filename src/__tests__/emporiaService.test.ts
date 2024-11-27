import dotenv from 'dotenv';
dotenv.config();

import { EmporiaService } from '../services/emporiaService';
import { User } from '../models/models';
import { initializeDatabase, sequelize } from '../models';

describe('EmporiaService Tests', () => {
  let emporiaService: EmporiaService;
  let testUser: User;

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

  describe('EmporiaService#authenticate', () => {
    it('should authenticate successfully', async () => {
      await emporiaService.authenticate(
        process.env.EMPORIA_USERNAME as string,
        process.env.EMPORIA_PASSWORD as string,
        testUser
      );

      expect(testUser.emporiaIdToken).toBeTruthy();
      expect(testUser.emporiaRefreshToken).toBeTruthy();
      expect(testUser.emporiaIdTokenExpiresAt).toBeTruthy();
      expect(testUser.emporiaUsername).toBe(process.env.EMPORIA_USERNAME);
    });

    it('should throw error if invalid credentials', async () => {
      await expect(emporiaService.authenticate('invalid', 'invalid', testUser)).rejects.toThrow(
        'Emporia authentication failed'
      );

      // Ensure that user tokens were not updated
      expect(testUser.emporiaIdToken).toBeUndefined();
      expect(testUser.emporiaRefreshToken).toBeUndefined();
      expect(testUser.emporiaIdTokenExpiresAt).toBeUndefined();
    });
  });

  describe('EmporiaService#getCustomerDetails', () => {
    it('should get customer details successfully', async () => {
      await emporiaService.authenticate(
        process.env.EMPORIA_USERNAME as string,
        process.env.EMPORIA_PASSWORD as string,
        testUser
      );

      const customer = await emporiaService.getCustomerDetails(testUser);

      expect(customer.customerGid).toBeTruthy();
      expect(customer.email).toBeTruthy();
      expect(customer.firstName).toBeTruthy();
      expect(customer.lastName).toBeTruthy();
      expect(customer.createdAt).toBeTruthy();
    });

    it('should throw error if user lacks valid Emporia credentials', async () => {
      // Ensure testUser does not have valid tokens
      await testUser.update({
        emporiaUsername: null,
        emporiaIdToken: null,
        emporiaRefreshToken: null,
        emporiaIdTokenExpiresAt: null,
      });

      await expect(emporiaService.getCustomerDetails(testUser)).rejects.toThrow(
        'User does not have valid Emporia credentials'
      );
    });
  });

  describe('EmporiaService#refreshTokensIfNeeded', () => {
    beforeEach(async () => {
      await emporiaService.authenticate(
        process.env.EMPORIA_USERNAME as string,
        process.env.EMPORIA_PASSWORD as string,
        testUser
      );
    });

    // This works but skip since we are intermittently getting this error `Emporia authentication failed: NotAuthorizedException: Password attempts exceeded`
    it.skip('should refresh tokens if the idToken is expired', async () => {
      // Set the emporiaIdTokenExpiresAt to a past date to simulate expiration
      await testUser.update({ emporiaIdTokenExpiresAt: new Date(Date.now() - 1000) });
      await testUser.reload();

      const oldIdToken = testUser.emporiaIdToken;

      await emporiaService['refreshTokensIfNeeded'](testUser);

      expect(testUser.emporiaIdToken).not.toBe(oldIdToken);
      expect(testUser.emporiaRefreshToken).toBeTruthy();
      expect(testUser.emporiaIdTokenExpiresAt).toBeTruthy();
    });

    it('should not refresh tokens if the idToken is still valid', async () => {
      const oldIdToken = testUser.emporiaIdToken;

      await emporiaService['refreshTokensIfNeeded'](testUser);

      expect(testUser.emporiaIdToken).toBe(oldIdToken);
    });

    // This works but skip since we are intermittently getting this error `Emporia authentication failed: NotAuthorizedException: Password attempts exceeded`
    it.skip('should throw an error if no refresh token is available', async () => {
      await testUser.update({ emporiaRefreshToken: null });
      await testUser.reload();

      await expect(emporiaService['refreshTokensIfNeeded'](testUser)).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('EmporiaService#refreshTokens', () => {
    beforeEach(async () => {
      await emporiaService.authenticate(
        process.env.EMPORIA_USERNAME as string,
        process.env.EMPORIA_PASSWORD as string,
        testUser
      );
    });

    it('should update user tokens on successful refresh', async () => {
      const oldIdToken = testUser.emporiaIdToken;

      // Simulate expiration
      await testUser.update({ emporiaIdTokenExpiresAt: new Date(Date.now() - 1000) });
      await testUser.reload();

      await emporiaService['refreshTokens'](testUser);

      expect(testUser.emporiaIdToken).not.toBe(oldIdToken);
      expect(testUser.emporiaRefreshToken).toBeTruthy();
      expect(testUser.emporiaIdTokenExpiresAt).toBeTruthy();
    });

    it('should throw an error if token refresh fails', async () => {
      await testUser.update({ emporiaRefreshToken: 'invalidRefreshToken' });
      await testUser.reload();

      await expect(emporiaService['refreshTokens'](testUser)).rejects.toThrow();
    });
  });
});
