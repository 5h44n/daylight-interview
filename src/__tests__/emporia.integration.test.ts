import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import request from 'supertest';
import { setupRoutes } from '../routes';
import { initializeDatabase, sequelize } from '../models';
import { User } from '../models/models';

describe('Emporia Authentication Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    setupRoutes(app);

    await initializeDatabase();

    // Force sync to ensure tables are created
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  it('should successfully authenticate with Emporia and save tokens', async () => {
    // Create a test user
    const testUser = await User.create({
      email: 'test@example.com',
    });

    const credentials = {
      emporiaUsername: process.env.EMPORIA_USERNAME,
      emporiaPassword: process.env.EMPORIA_PASSWORD,
    };

    // Attempt to authenticate with Emporia
    const response = await request(app)
      .post(`/users/${testUser.id}/emporia-auth`)
      .send(credentials);

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Emporia authentication successful' });

    // Verify the tokens were saved to the database
    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser?.emporiaAccessToken).toBeTruthy();
    expect(updatedUser?.emporiaRefreshToken).toBeTruthy();
  }, 30000);
});
