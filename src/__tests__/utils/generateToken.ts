import jwt from 'jsonwebtoken';
import { User } from '../../models/user';

export const generateToken = (user: User, expiresIn: string = '1h'): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET as string,
    { expiresIn }
  );
};
