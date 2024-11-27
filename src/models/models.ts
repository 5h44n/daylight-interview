import { Sequelize, DataTypes, Model } from 'sequelize';

class User extends Model {
  public id!: number;
  public email!: string;
  public emporiaAccessToken?: string;
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
      emporiaAccessToken: {
        type: DataTypes.STRING,
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
