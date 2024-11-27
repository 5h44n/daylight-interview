import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const CLIENT_ID = '4qte47jbstod8apnfic0bunmrq';
const USER_POOL = 'us-east-2_ghlOXVLi1';

export interface EmporiaTokens {
  accessToken: string;
  refreshToken: string;
}

export class EmporiaService {
  static async authenticate(username: string, password: string): Promise<EmporiaTokens> {
    const userPool = new CognitoUserPool({
      UserPoolId: USER_POOL,
      ClientId: CLIENT_ID,
    });

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    return new Promise<EmporiaTokens>((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
          });
        },
        onFailure: (err) => {
          console.error('Emporia authentication failed:', err);
          reject(new Error('Emporia authentication failed'));
        },
      });
    });
  }
}
