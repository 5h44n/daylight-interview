import dotenv from 'dotenv';
dotenv.config();

import { EmporiaService } from '../services/emporiaService';
import { User } from '../models/user';
import { initializeDatabase, sequelize } from '../database';

describe('EmporiaService Tests', () => {
  let emporiaService: EmporiaService;
  let authenticatedUser: User;
  let invalidAuthenticatedUser: User;
  let unauthenticatedUser: User;

  beforeAll(async () => {
    if (!process.env.EMPORIA_USERNAME || !process.env.EMPORIA_PASSWORD) {
      throw new Error('EMPORIA_USERNAME and EMPORIA_PASSWORD environment variables are required');
    }

    jest.spyOn(console, 'error').mockImplementation(() => {});

    await initializeDatabase();
    await sequelize.sync({ force: true });

    emporiaService = new EmporiaService();

    authenticatedUser = await User.create({ email: 'valid@user.com' });
    await emporiaService.authenticate(
      process.env.EMPORIA_USERNAME as string,
      process.env.EMPORIA_PASSWORD as string,
      authenticatedUser
    );

    invalidAuthenticatedUser = await User.create({
      email: 'invalid@user.com',
      emporiaUsername: 'invalidUser',
      emporiaIdToken: 'invalidIdToken',
      emporiaRefreshToken: 'invalidRefreshToken',
      emporiaIdTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60), // Still valid but invalid token
    });

    unauthenticatedUser = await User.create({ email: 'unauthenticated@user.com' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('EmporiaService#getCustomerDetails', () => {
    it('should get customer details successfully', async () => {
      const customer = await emporiaService.getCustomerDetails(authenticatedUser);

      expect(customer.customerGid).toBeTruthy();
      expect(customer.email).toBeTruthy();
      expect(customer.firstName).toBeTruthy();
      expect(customer.lastName).toBeTruthy();
      expect(customer.createdAt).toBeTruthy();
    });

    it('should throw error if user lacks valid Emporia credentials', async () => {
      await expect(emporiaService.getCustomerDetails(unauthenticatedUser)).rejects.toThrow(
        'User does not have valid Emporia credentials'
      );
    });
  });

  describe('EmporiaService#getCustomerDevices', () => {
    it('should return customer devices successfully', async () => {
      const devicesData = await emporiaService.getCustomerDevices(authenticatedUser);

      expect(devicesData.customerGid).toBeTruthy();
      expect(devicesData.devices).toBeTruthy();
      expect(devicesData.devices.length).toBeGreaterThan(0);
    });

    it('should throw an error if user lacks valid Emporia credentials', async () => {
      await expect(emporiaService.getCustomerDevices(unauthenticatedUser)).rejects.toThrow(
        'User does not have valid Emporia credentials'
      );
    });

    it('should throw an error if the API call fails due to invalid token', async () => {
      await expect(emporiaService.getCustomerDevices(invalidAuthenticatedUser)).rejects.toThrow(
        'Failed to fetch customer devices'
      );
    });
  });

  describe('EmporiaService#refreshTokensIfNeeded', () => {
    it('should not refresh tokens if the idToken is still valid', async () => {
      const oldIdToken = authenticatedUser.emporiaIdToken;
      const oldExpiresAt = authenticatedUser.emporiaIdTokenExpiresAt;

      await emporiaService['refreshTokensIfNeeded'](authenticatedUser);

      expect(authenticatedUser.emporiaIdToken).toBe(oldIdToken);
      expect(authenticatedUser.emporiaIdTokenExpiresAt).toBe(oldExpiresAt);
    });

    it('should refresh tokens if the idToken is expired', async () => {
      // Simulate expiration
      await authenticatedUser.update({ emporiaIdTokenExpiresAt: new Date(Date.now() - 1000) });
      await authenticatedUser.reload();

      await emporiaService['refreshTokensIfNeeded'](authenticatedUser);

      // TODO: Could mock this
      // AWS Cognito will return the same token and expiry time if it's still valid, so just check that the call was successful and the tokens are still set
      expect(authenticatedUser.emporiaIdToken).toBeTruthy();
      expect(authenticatedUser.emporiaRefreshToken).toBeTruthy();
      expect(authenticatedUser.emporiaIdTokenExpiresAt).toBeTruthy();
    });

    it('should throw an error if no refresh token is available', async () => {
      await unauthenticatedUser.update({ emporiaRefreshToken: null });

      await expect(emporiaService['refreshTokensIfNeeded'](unauthenticatedUser)).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('EmporiaService#refreshTokens', () => {
    it('should update user tokens on successful refresh', async () => {
      // Simulate expiration
      await authenticatedUser.update({ emporiaIdTokenExpiresAt: new Date(Date.now() - 1000) });
      await authenticatedUser.reload();

      await emporiaService['refreshTokens'](authenticatedUser);

      // TODO: Could mock this
      // AWS Cognito will return the same token and expiry time if it's still valid, so just check that the call was successful and the tokens are still set
      expect(authenticatedUser.emporiaIdToken).toBeTruthy();
      expect(authenticatedUser.emporiaRefreshToken).toBeTruthy();
      expect(authenticatedUser.emporiaIdTokenExpiresAt).toBeTruthy();
    });

    it('should throw an error if token refresh fails', async () => {
      await invalidAuthenticatedUser.update({ emporiaRefreshToken: 'invalidRefreshToken' });

      await expect(emporiaService['refreshTokens'](invalidAuthenticatedUser)).rejects.toThrow();
    });
  });
});
