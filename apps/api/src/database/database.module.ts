import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InitialSchema1732640000000 } from './migrations/1732640000000-InitialSchema.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isSsl = config.get<string>('DATABASE_SSL') === 'true';
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const requestedSync = config.get<string>('DB_SYNCHRONIZE');

        if (isProd && requestedSync === 'true') {
          logger.error(
            'FATAL: DB_SYNCHRONIZE=true is not allowed in production. Use TypeORM migrations instead.',
          );
          throw new Error(
            'DB_SYNCHRONIZE must be false in production. Use migrations.',
          );
        }

        const syncEnabled =
          !isProd && config.get<string>('DB_SYNCHRONIZE', 'true') === 'true';
        const migrationsRun =
          config.get<string>(
            'DB_MIGRATIONS_RUN',
            isProd ? 'true' : 'false',
          ) === 'true';

        const poolMax = Number(config.get<number>('DATABASE_POOL_MAX', 20));
        const timeout = Number(
          config.get<number>('DATABASE_TIMEOUT', 10000),
        );

        const baseConfig = {
          type: 'postgres' as const,
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: syncEnabled,
          migrations: [InitialSchema1732640000000],
          migrationsRun,
          logging: isProd ? ['error' as const, 'warn' as const] : false,
          extra: {
            max: poolMax,
            connectionTimeoutMillis: timeout,
          },
        };

        if (databaseUrl) {
          logger.log(
            `Connecting to PostgreSQL via DATABASE_URL (pool: ${poolMax}, ssl: ${isSsl}, sync: ${syncEnabled}, migrationsRun: ${migrationsRun})`,
          );
          return {
            ...baseConfig,
            url: databaseUrl,
          };
        }

        const host = config.get<string>('DATABASE_HOST', 'localhost');
        const port = Number(config.get<number>('DATABASE_PORT', 5432));
        const dbName = config.get<string>('DATABASE_NAME', 'postgres');

        logger.log(
          `Connecting to PostgreSQL at ${host}:${port}/${dbName} (pool: ${poolMax}, ssl: ${isSsl}, sync: ${syncEnabled}, migrationsRun: ${migrationsRun})`,
        );

        return {
          ...baseConfig,
          host,
          port,
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', ''),
          database: dbName,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
