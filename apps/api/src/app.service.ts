import { Injectable } from '@nestjs/common';
import { ProfessionalDomain, UserStatus } from '@interviewai/shared-types';

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  service: string;
  domains: ProfessionalDomain[];
  defaultUserStatus: UserStatus;
}

@Injectable()
export class AppService {
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'interviewai-api',
      domains: [ProfessionalDomain.SDE, ProfessionalDomain.SAP],
      defaultUserStatus: UserStatus.ACTIVE,
    };
  }
}
