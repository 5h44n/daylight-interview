import { Request, Response } from 'express';
import { User } from '../models/user';
import { EmporiaService } from '../services/emporiaService';

export class EmporiaController {
  private emporiaService: EmporiaService;

  constructor() {
    this.emporiaService = new EmporiaService();
  }

  async authenticate(req: Request, res: Response) {
    try {
      const id = req.userId;
      const { emporiaUsername, emporiaPassword } = req.body;

      if (!emporiaUsername || !emporiaPassword) {
        return res.status(400).json({ error: 'Missing required credentials' });
      }
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await this.emporiaService.authenticate(emporiaUsername, emporiaPassword, user);

      res.status(200).json({ message: 'Emporia authentication successful' });
    } catch (error) {
      res.status(400).json({ error: 'Emporia authentication failed' });
    }
  }
}
