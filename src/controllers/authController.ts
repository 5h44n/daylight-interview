import dotenv from 'dotenv';
dotenv.config();

import { Request, Response } from 'express';
import { User } from '../models/user';
import jwt from 'jsonwebtoken';

export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists.' });
        return;
      }

      // Create new user
      const user = await User.create({ email, password });

      // Exclude password from the response
      const userResponse = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.status(201).json({ user: userResponse });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      // Compare passwords
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      // Generate JWT
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
      );

      res.status(200).json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'emporiaUsername', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error('GetMe error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
}
