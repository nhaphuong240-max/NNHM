import { Injectable } from '@nestjs/common';

@Injectable()
export class IdentityService {
  status() {
    return { module: 'identity', phase: 'S1', ucs: ['UC-ID-01', 'UC-ID-03', 'UC-ID-04'] };
  }
}
