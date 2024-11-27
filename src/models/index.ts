import { Sequelize } from 'sequelize';
import { initializeModels } from './models';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false
});

export async function initializeDatabase() {
  try {
    initializeModels(sequelize);
    await sequelize.sync();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export { sequelize };
