import { Application } from 'express';
import { User } from '../models/models';
import { EmporiaService } from '../services/emporiaService';

export function setupRoutes(app: Application) {
  app.get('/users', async (req, res) => {
    try {
      const users = await User.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/users', async (req, res) => {
    try {
      const user = await User.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  app.post('/users/:id/emporia-auth', async (req, res) => {
    try {
      const { id } = req.params;
      const { emporiaUsername, emporiaPassword } = req.body;

      if (!emporiaUsername || !emporiaPassword) {
        return res.status(400).json({ error: 'Missing required credentials' });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const tokens = await EmporiaService.authenticate(emporiaUsername, emporiaPassword);

      await user.update({
        emporiaAccessToken: tokens.accessToken,
        emporiaRefreshToken: tokens.refreshToken,
      });

      res.status(200).json({ message: 'Emporia authentication successful' });
    } catch (error) {
      res.status(400).json({ error: 'Emporia authentication failed' });
    }
  });
}
