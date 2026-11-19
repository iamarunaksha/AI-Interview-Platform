import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSsl = config.get<string>('DATABASE_SSL') === 'true';
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const syncEnabled =
          !isProd && config.get<string>('DB_SYNCHRONIZE', 'true') === 'true';

        return {
          type: 'postgres',
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port: Number(config.get<number>('DATABASE_PORT', 5432)),
          username: config.get<string>('DATABASE_USER', 'postgres'),
          password: config.get<string>('DATABASE_PASSWORD', ''),
          database: config.get<string>('DATABASE_NAME', 'postgres'),
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: syncEnabled,
          extra: {
            max: Number(config.get<number>('DATABASE_POOL_MAX', 20)),
            connectionTimeoutMillis: Number(
              config.get<number>('DATABASE_TIMEOUT', 10000),
            ),
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
