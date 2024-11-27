import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import {
  EmporiaTokens,
  EmporiaCustomer,
  EmporiaCustomerDevices,
} from '../interfaces/emporiaInterfaces';

const CLIENT_ID = '4qte47jbstod8apnfic0bunmrq';
const USER_POOL = 'us-east-2_ghlOXVLi1';

export class EmporiaService {
  private BASE_URL = 'https://api.emporiaenergy.com';

  async getCustomerDetails(user: User): Promise<EmporiaCustomer> {
    if (!user.emporiaUsername || !user.emporiaIdToken) {
      throw new Error('User does not have valid Emporia credentials');
    }

    await this.refreshTokensIfNeeded(user);

    const response = await fetch(
      `${this.BASE_URL}/customers?email=${encodeURIComponent(user.emporiaUsername)}`,
      {
        headers: {
          authtoken: user.emporiaIdToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch customer details: ${response.statusText}`);
    }

    const customer = await response.json();

    return customer as EmporiaCustomer;
  }

  async getCustomerDevices(user: User): Promise<EmporiaCustomerDevices> {
    if (!user.emporiaIdToken) {
      throw new Error('User does not have valid Emporia credentials');
    }

    await this.refreshTokensIfNeeded(user);

    const response = await fetch(`${this.BASE_URL}/customers/devices`, {
      headers: {
        authtoken: user.emporiaIdToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch customer devices: ${response.statusText}`);
    }

    const devicesData = await response.json();

    return devicesData as EmporiaCustomerDevices;
  }

  async authenticate(username: string, password: string, user: User): Promise<EmporiaTokens> {
    const userPool = new CognitoUserPool({
      UserPoolId: USER_POOL,
      ClientId: CLIENT_ID,
    });

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    return new Promise<EmporiaTokens>((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          const idToken = result.getIdToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();

          const idTokenExpiresAt = this.getTokenExpiration(idToken);

          await user.update({
            emporiaUsername: username,
            emporiaIdToken: idToken,
            emporiaRefreshToken: refreshToken,
            emporiaIdTokenExpiresAt: idTokenExpiresAt,
          });

          resolve({ idToken, refreshToken, idTokenExpiresAt });
        },
        onFailure: (err) => {
          console.error('Emporia authentication failed:', err);
          reject(new Error('Emporia authentication failed'));
        },
      });
    });
  }

  private async refreshTokensIfNeeded(user: User): Promise<void> {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (
      !user.emporiaIdTokenExpiresAt ||
      user.emporiaIdTokenExpiresAt.getTime() - now.getTime() <= bufferTime
    ) {
      await this.refreshTokens(user);
    }
  }

  private async refreshTokens(user: User): Promise<void> {
    if (!user.emporiaRefreshToken) {
      throw new Error('No refresh token available');
    }

    const userPool = new CognitoUserPool({
      UserPoolId: USER_POOL,
      ClientId: CLIENT_ID,
    });

    return new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: user.emporiaUsername || '',
        Pool: userPool,
      });

      const refreshToken = new CognitoRefreshToken({
        RefreshToken: user.emporiaRefreshToken!,
      });

      cognitoUser.refreshSession(refreshToken, async (err, session) => {
        if (err) {
          console.error('Token refresh failed:', err);
          return reject(err);
        }

        const idToken = session.getIdToken().getJwtToken();
        const newRefreshToken = session.getRefreshToken().getToken();

        const idTokenExpiresAt = this.getTokenExpiration(idToken);

        await user.update({
          emporiaIdToken: idToken,
          emporiaRefreshToken: newRefreshToken,
          emporiaIdTokenExpiresAt: idTokenExpiresAt,
        });

        resolve();
      });
    });
  }

  private getTokenExpiration(token: string): Date {
    const decoded = jwt.decode(token) as { exp: number };
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token');
    }
    return new Date(decoded.exp * 1000);
  }
}
