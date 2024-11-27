import { Sequelize, DataTypes, Model } from 'sequelize';

class User extends Model {
  public id!: number;
  public email!: string;
  public emporiaUsername?: string;
  public emporiaIdToken?: string;
  public emporiaIdTokenExpiresAt?: Date;
  public emporiaRefreshToken?: string;
}

export function initializeModels(sequelize: Sequelize) {
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
    }
  );
}

export { User };
