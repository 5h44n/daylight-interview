import { Request, Response } from 'express';
import { User } from '../models/user';
import { EmporiaService } from '../services/emporiaService';

export class DevicesController {
  private emporiaService: EmporiaService;

  constructor() {
    this.emporiaService = new EmporiaService();
  }

  async getUserDevices(req: Request, res: Response) {
    try {
      const id = req.userId;
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

  async getChartUsage(req: Request, res: Response) {
    try {
      const deviceId = req.params.id;
      const { channels, start, end, scale, energyUnit } = req.query;

      // Validate required query parameters
      if (!channels || !start || !end || !scale || !energyUnit) {
        return res.status(400).json({ error: 'Missing required query parameters.' });
      }

      // Parse channels into an array of numbers
      const channelsArray = Array.isArray(channels) ? channels.map(Number) : [Number(channels)];

      // Validate and parse dates
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format for start or end.' });
      }

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      const scaleStr = scale as string;
      const energyUnitStr = energyUnit as string;

      // Retrieve the authenticated user
      const userId = req.userId;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch chart usage from EmporiaService
      const chartUsage = await this.emporiaService.getChartUsage(
        user,
        Number(deviceId),
        channelsArray,
        startISO,
        endISO,
        scaleStr,
        energyUnitStr
      );

      res.status(200).json(chartUsage);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch chart usage' });
    }
  }
}
