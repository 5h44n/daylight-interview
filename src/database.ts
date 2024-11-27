import { Sequelize } from 'sequelize';
import { initializeUser } from './models/user';

const isTestEnv = process.env.NODE_ENV === 'test';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: isTestEnv ? ':memory:' : 'database.sqlite',
  logging: false,
  define: {
    timestamps: true,
  },
});

export function initializeModels(sequelize: Sequelize) {
  initializeUser(sequelize);
}

export async function initializeDatabase() {
  try {
    initializeModels(sequelize);
    await sequelize.sync();
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
