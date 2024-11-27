import { Request, Response } from 'express';
import { User } from '../models/models';
import { EmporiaService } from '../services/emporiaService';

export class DevicesController {
  private emporiaService: EmporiaService;

  constructor() {
    this.emporiaService = new EmporiaService();
  }

  async getUserDevices(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const devicesData = await this.emporiaService.getCustomerDevices(user);

      res.status(200).json(devicesData);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(400).json({ error: 'Failed to fetch devices' });
    }
  }
}
