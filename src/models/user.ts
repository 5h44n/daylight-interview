// src/models/models.ts

import { Sequelize, DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';

class User extends Model {
  public id!: string; // Changed to string to accommodate UUID
  public email!: string;
  public password!: string; // Added password field
  public emporiaUsername?: string;
  public emporiaIdToken?: string;
  public emporiaIdTokenExpiresAt?: Date;
  public emporiaRefreshToken?: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to compare passwords
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

export function initializeUser(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        // New password field
        type: DataTypes.STRING,
        allowNull: false,
      },
      emporiaUsername: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emporiaIdToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emporiaIdTokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      emporiaRefreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      hooks: {
        beforeCreate: async (user: User) => {
          const saltRounds = 10;
          const salt = await bcrypt.genSalt(saltRounds);
          user.password = await bcrypt.hash(user.password, salt);
        },
        beforeUpdate: async (user: User) => {
          if (user.changed('password')) {
            const saltRounds = 10;
            const salt = await bcrypt.genSalt(saltRounds);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );
}

export { User };
