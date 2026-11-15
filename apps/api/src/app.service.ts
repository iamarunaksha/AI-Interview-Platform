import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProfessionalDomain, UserStatus } from '@interviewai/shared-types';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  service: string;
  database: {
    status: 'connected' | 'disconnected';
    databaseName?: string;
    version?: string;
  };
  domains: ProfessionalDomain[];
  defaultUserStatus: UserStatus;
}

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  async getHealth(): Promise<HealthCheckResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbVersion: string | undefined;

    try {
      if (this.dataSource.isInitialized) {
        const result = await this.dataSource.query('SELECT version()');
        dbStatus = 'connected';
        dbVersion = (result[0]?.version as string)?.split(' on ')?.[0] ?? 'PostgreSQL';
      }
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'interviewai-api',
      database: {
        status: dbStatus,
        databaseName: this.dataSource.isInitialized ? 'postgres' : undefined,
        version: dbVersion,
      },
      domains: [ProfessionalDomain.SDE, ProfessionalDomain.SAP],
      defaultUserStatus: UserStatus.ACTIVE,
    };
  }
}
