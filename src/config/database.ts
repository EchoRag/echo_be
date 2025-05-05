import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

// Skip SSL configuration in test environment
const sslConfig = process.env.NODE_ENV === 'test' 
  ? undefined 
  : {
      ca: process.env.DB_PEM || readFileSync(join(process.cwd(), 'creds', 'ca.pem')).toString()
    };

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: sslConfig,
  synchronize: false, //process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [process.env.NODE_ENV === 'production' ? 'models/**/*.js' : 'src/models/**/*.ts'],
  migrations: [process.env.NODE_ENV === 'production' ? 'migrations/**/*.js' : 'src/migrations/**/*.ts'],
  subscribers: [process.env.NODE_ENV === 'production' ? 'subscribers/**/*.js' : 'src/subscribers/**/*.ts'],
}); 