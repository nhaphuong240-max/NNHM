import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/identity/decorators/public.decorator';

@Public()
@Controller()
export class RootController {
  @Get()
  index() {
    return {
      service: 'wereal-api',
      version: '0.1.0',
      baseline: 'WEREAL-BL-2026-002',
      links: {
        health: '/api/v1/health',
        login: '/api/v1/auth/login',
        refresh: '/api/v1/auth/refresh',
        units: '/api/v1/units',
        listings: '/api/v1/listings',
        searchUnits: '/api/v1/search/units',
        searchUnitDetail: '/api/v1/search/units/{unitId}',
        leads: '/api/v1/leads',
        bookings: '/api/v1/bookings',
        bookingTimeline: '/api/v1/bookings/{id}/timeline',
        bookingEvents: '/api/v1/bookings/{id}/events',
        paymentIntents: '/api/v1/payment-intents',
        paymentWebhook: '/api/v1/webhooks/payment',
        ledgerEntries: '/api/v1/ledger/entries',
        ledgerReconciliation: '/api/v1/ledger/reconciliation',
        commissionPolicies: '/api/v1/commission/policies',
        commissionSnapshots: '/api/v1/commission/snapshots',
        commissionExport: '/api/v1/commission/export.csv',
        auditExport: '/api/v1/audit/events/export.csv',
        streamUnits: '/api/v1/stream/units',
        opsConsole: '/api/v1/ops/console',
        healthOps: '/api/v1/health/ops',
        auditEvents: '/api/v1/audit/events',
        authStatus: '/api/v1/auth/status',
        authMe: '/api/v1/auth/me',
        tenants: '/api/v1/tenants',
        users: '/api/v1/users',
      },
      docs: '../../openapi.json',
    };
  }
}
