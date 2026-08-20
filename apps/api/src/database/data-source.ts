import { DataSource } from 'typeorm';
import { createCliDataSourceOptions } from './typeorm-options';

/** TypeORM CLI entry — `npm run migration:run` */
export default new DataSource(createCliDataSourceOptions());
