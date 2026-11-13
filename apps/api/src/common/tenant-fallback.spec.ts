import { ForbiddenException, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { AiChatController } from '../modules/ai-chat/ai-chat.controller';
import { ProductAnalyticsController } from '../modules/analytics/product-analytics.controller';
import { BookingContractController } from '../modules/booking/booking-contract.controller';
import { CmsController } from '../modules/cms/cms.controller';
import { EkycController } from '../modules/ekyc/ekyc.controller';
import { SsoService } from '../modules/identity/sso.service';
import { TenantBrandingController } from '../modules/identity/tenant-branding.controller';
import { NotaryConnectorController } from '../modules/integrations/notary-connector.controller';
import { PaymentBnplController } from '../modules/payment/payment-bnpl.controller';
import { PaymentController } from '../modules/payment/payment.controller';
import { signWebhookPayload } from '../modules/payment/webhook/webhook-signature.util';
import { PortalController } from '../modules/portal/portal.controller';
import { SearchController } from '../modules/search/search.controller';
import { StreamController } from '../modules/stream/stream.controller';
import { SimulateRailGuard } from '../modules/tenant-config/simulate-rail.guard';
import { allowDefaultTenant, refuseDefaultTenantAtBoot } from './default-tenant-flag';
import { resolveTenantId } from './resolve-tenant-id';

const SEED = 'ten_dev_01';
const TENANT_B = 'ten_b';

function dataSourceReturning(rows: Array<{ tenant_id: string }>) {
  const query = jest.fn(async (sql: string) => (sql.includes('INSERT INTO audit_events') ? [] : rows));
  return {
    query,
    createQueryRunner: () => ({
      connect: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
      query,
    }),
  } as unknown as DataSource;
}

function config(): ConfigService {
  return { get: (_key: string, fallback?: string) => fallback } as ConfigService;
}

function httpContext(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe('tenant fallback is closed', () => {
  const env = process.env.NODE_ENV;
  const flag = process.env.ALLOW_DEFAULT_TENANT;

  afterEach(() => {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
    if (flag === undefined) delete process.env.ALLOW_DEFAULT_TENANT;
    else process.env.ALLOW_DEFAULT_TENANT = flag;
  });

  it('refuses to boot when ALLOW_DEFAULT_TENANT is set in production, staging, or an empty NODE_ENV', () => {
    for (const nodeEnv of ['production', 'staging', '']) {
      process.env.NODE_ENV = nodeEnv;
      process.env.ALLOW_DEFAULT_TENANT = 'true';
      expect(() => refuseDefaultTenantAtBoot()).toThrow(/Refusing to start/);
      expect(allowDefaultTenant()).toBe(false);
    }
  });

  it('allows the explicit flag only in development and test', () => {
    process.env.ALLOW_DEFAULT_TENANT = 'true';
    process.env.NODE_ENV = 'development';
    expect(() => refuseDefaultTenantAtBoot()).not.toThrow();
    expect(allowDefaultTenant()).toBe(true);
    process.env.NODE_ENV = 'test';
    expect(allowDefaultTenant()).toBe(true);
    delete process.env.ALLOW_DEFAULT_TENANT;
    expect(allowDefaultTenant()).toBe(false);
    expect(() => refuseDefaultTenantAtBoot()).not.toThrow();
  });

  it('resolveTenantId does not treat the header or the seed tenant as a source', () => {
    delete process.env.ALLOW_DEFAULT_TENANT;
    expect(() => resolveTenantId(config(), undefined, SEED)).toThrow(UnprocessableEntityException);
    expect(() => resolveTenantId(config(), undefined, undefined)).toThrow(UnprocessableEntityException);
  });

  it('portal buyer routes 404 without a host or booking and 403 on a mismatched header', async () => {
    const portal = {
      getBuyerDeals: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      getBuyerDeal: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      sendBuyerDealNotificationStub: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      registerBuyerDevice: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      applyBuyerBnpl: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      getBuyerSignSession: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
      getPublicMap: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })),
    };
    const missing = new PortalController(portal as never, config(), dataSourceReturning([]));
    await expect(missing.buyerDeals(undefined, undefined, undefined)).rejects.toBeInstanceOf(NotFoundException);
    await expect(missing.buyerDeal(undefined, undefined, 'bk_missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(missing.buyerDealNotifyStub(undefined, 'bk_missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(() => missing.registerBuyerDevice(undefined, undefined, {})).toThrow(NotFoundException);
    await expect(missing.applyBuyerBnpl(undefined, 'bk_missing', {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(missing.buyerSignSession(undefined, 'bk_missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(missing.publicMap(undefined, undefined, undefined)).rejects.toBeInstanceOf(NotFoundException);
    expect(portal.getBuyerDeals).not.toHaveBeenCalled();
    expect(portal.getBuyerDeal).not.toHaveBeenCalled();

    const found = new PortalController(
      portal as never,
      config(),
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(found.buyerDeal(undefined, SEED, 'bk_b')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(found.buyerDeal(undefined, TENANT_B, 'bk_b')).resolves.toEqual({ meta: { tenantId: TENANT_B } });
    await expect(found.publicMap(undefined, 'portal.thanglong-dev.vn', undefined)).resolves.toEqual({
      meta: { tenantId: 'ten_pilot_cdt_01' },
    });
    expect(JSON.stringify(portal.getBuyerDeal.mock.calls)).not.toContain(SEED);
  });

  it('cms and public brand do not read the seed tenant without a registered host or slug', async () => {
    const cms = { listAreas: jest.fn(), getAreaLanding: jest.fn() };
    const homepage = { getHomepagePack: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const cmsMissing = new CmsController(cms as never, homepage as never, config(), dataSourceReturning([]));
    expect(() => cmsMissing.listAreas(undefined, undefined, undefined)).toThrow(NotFoundException);
    expect(() => cmsMissing.homepagePack(undefined, undefined, undefined)).toThrow(NotFoundException);
    await expect(cmsMissing.areaLanding(undefined, undefined, 'ba-dinh')).rejects.toBeInstanceOf(NotFoundException);
    expect(homepage.getHomepagePack).not.toHaveBeenCalled();

    const cmsFound = new CmsController(
      cms as never,
      homepage as never,
      config(),
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(cmsFound.areaLanding(undefined, SEED, 'ba-dinh')).rejects.toBeInstanceOf(ForbiddenException);
    await cmsFound.areaLanding(undefined, TENANT_B, 'ba-dinh');
    expect(cms.getAreaLanding).toHaveBeenCalledWith(TENANT_B, 'ba-dinh');

    const branding = { getBrand: jest.fn(async (tenantId: string) => ({ data: { tenantId } })) };
    const brand = new TenantBrandingController(branding as never, config());
    expect(() => brand.getPublic(undefined, 'localhost')).toThrow(NotFoundException);
    expect(() => brand.getPublic(SEED, 'portal.thanglong-dev.vn')).toThrow(ForbiddenException);
    await expect(brand.getPublic('ten_pilot_cdt_01', 'portal.thanglong-dev.vn')).resolves.toEqual({
      data: { tenantId: 'ten_pilot_cdt_01' },
    });
    expect(branding.getBrand).not.toHaveBeenCalledWith(SEED);
  });

  it('anonymous chat and analytics require a project or public token', async () => {
    const chat = { startSession: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })), message: jest.fn() };
    const chatMissing = new AiChatController(chat as never, dataSourceReturning([]));
    await expect(chatMissing.start(undefined, {})).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(chatMissing.message(undefined, { sessionId: 's', text: 'hi' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(chat.startSession).not.toHaveBeenCalled();

    const chatFound = new AiChatController(chat as never, dataSourceReturning([{ tenant_id: TENANT_B }]));
    await expect(chatFound.start(SEED, { projectId: 'prj_b' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(chatFound.start(TENANT_B, { projectId: 'prj_b' })).resolves.toEqual({ meta: { tenantId: TENANT_B } });

    const analytics = { track: jest.fn(), trackBatch: jest.fn() };
    const beacon = new ProductAnalyticsController(analytics as never, dataSourceReturning([]));
    await expect(beacon.trackEvents(undefined, { name: 'unit_viewed' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(analytics.track).not.toHaveBeenCalled();
    const beaconFound = new ProductAnalyticsController(
      analytics as never,
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    analytics.track.mockResolvedValue({ meta: { tenantId: TENANT_B } });
    await beaconFound.trackEvents(TENANT_B, { name: 'unit_viewed', projectId: 'prj_b' });
    expect(analytics.track).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT_B }));
    expect(JSON.stringify(analytics.track.mock.calls)).not.toContain(SEED);
  });

  it('sso authorize and login take the tenant from the stored provider', async () => {
    const beginAuthorize = jest.fn(async (tenantId: string) => ({ data: { tenantId } }));
    const login = jest.fn(async (tenantId: string) => ({ data: { tenantId } }));
    const missing = Object.assign(Object.create(SsoService.prototype), {
      dataSource: dataSourceReturning([]),
      beginAuthorize,
      login,
    }) as SsoService;
    await expect(missing.beginAuthorizeForProvider({ providerId: 'sso_missing' }, SEED)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(
      missing.loginForProvider({ providerId: 'sso_missing', email: 'a@b.vn' }, SEED),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(beginAuthorize).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();

    const found = Object.assign(Object.create(SsoService.prototype), {
      dataSource: dataSourceReturning([{ tenant_id: TENANT_B }]),
      beginAuthorize,
      login,
    }) as SsoService;
    await expect(found.beginAuthorizeForProvider({ providerId: 'sso_b' }, SEED)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(found.loginForProvider({ providerId: 'sso_b', email: 'a@b.vn' }, TENANT_B)).resolves.toEqual({
      data: { tenantId: TENANT_B },
    });
    expect(login).toHaveBeenCalledWith(TENANT_B, expect.objectContaining({ providerId: 'sso_b' }));
  });

  it('public checkout, contract sign, search detail, and the unit stream use the stored row', async () => {
    const payment = { getCheckout: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const payMissing = new PaymentController(payment as never, config(), dataSourceReturning([]));
    await expect(payMissing.checkout(undefined, 'pi_missing')).rejects.toBeInstanceOf(NotFoundException);
    const payFound = new PaymentController(payment as never, config(), dataSourceReturning([{ tenant_id: TENANT_B }]));
    await expect(payFound.checkout(SEED, 'pi_b')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(payFound.checkout(TENANT_B, 'pi_b')).resolves.toEqual({ meta: { tenantId: TENANT_B } });

    const contracts = { getSignSession: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const contractMissing = new BookingContractController(contracts as never, config(), dataSourceReturning([]));
    await expect(contractMissing.signSession(undefined, 'ctr_missing')).rejects.toBeInstanceOf(NotFoundException);
    const contractFound = new BookingContractController(
      contracts as never,
      config(),
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(contractFound.signSession(SEED, 'ctr_b')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(contractFound.signSession(TENANT_B, 'ctr_b')).resolves.toEqual({ meta: { tenantId: TENANT_B } });

    const search = { getUnitDetail: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const searchMissing = new SearchController(search as never, {} as never, dataSourceReturning([]));
    await expect(searchMissing.getUnitDetail(undefined, 'un_missing')).rejects.toBeInstanceOf(NotFoundException);
    const searchFound = new SearchController(
      search as never,
      {} as never,
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(searchFound.getUnitDetail(SEED, 'un_b')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(searchFound.getUnitDetail(TENANT_B, 'un_b')).resolves.toEqual({ meta: { tenantId: TENANT_B } });
    await expect(searchFound.searchUnits(undefined, undefined)).rejects.toBeInstanceOf(NotFoundException);

    const streamEvents = { subscribeUnits: jest.fn((tenantId: string) => ({ tenantId })) };
    const streamMissing = new StreamController(streamEvents as never, config(), dataSourceReturning([]));
    await expect(streamMissing.units(undefined, undefined, undefined, SEED)).rejects.toBeInstanceOf(NotFoundException);
    const streamFound = new StreamController(
      streamEvents as never,
      config(),
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(streamFound.units(undefined, SEED, 'un_b', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(streamFound.units(undefined, TENANT_B, 'un_b', undefined)).resolves.toEqual({ tenantId: TENANT_B });
    expect(streamEvents.subscribeUnits).not.toHaveBeenCalledWith(SEED);
  });

  it('bnpl, ekyc, and notary webhooks reject a missing record and do not use the seed tenant', async () => {
    const secret = 'bnpl-webhook-secret-for-test';
    const bnpl = { handlePartnerWebhook: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const bnplConfig = { get: (key: string) => (key === 'BNPL_WEBHOOK_SECRET' ? secret : '') } as ConfigService;
    const body = { externalId: 'bnpl_b', status: 'APPROVED' as const };
    const signature = signWebhookPayload(body, secret);
    const bnplMissing = new PaymentBnplController(bnpl as never, bnplConfig, dataSourceReturning([]));
    await expect(bnplMissing.partnerWebhook(undefined, signature, body)).rejects.toBeInstanceOf(NotFoundException);
    await expect(bnplMissing.partnerWebhook(undefined, 'bad', body)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(bnpl.handlePartnerWebhook).not.toHaveBeenCalled();

    const bnplFound = new PaymentBnplController(
      bnpl as never,
      bnplConfig,
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(bnplFound.partnerWebhook(SEED, signature, body)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(bnplFound.partnerWebhook(TENANT_B, signature, body)).resolves.toEqual({ meta: { tenantId: TENANT_B } });

    const ekyc = { handleWebhook: jest.fn(async (tenantId: string) => ({ meta: { tenantId } })) };
    const ekycConfig = { get: (key: string) => (key === 'EKYC_WEBHOOK_SECRET' ? secret : '') } as ConfigService;
    const ekycBody = { externalRef: 'kyc_b' };
    const ekycSignature = signWebhookPayload(ekycBody, secret);
    const ekycMissing = new EkycController(ekyc as never, ekycConfig, dataSourceReturning([]));
    await expect(ekycMissing.webhook(undefined, ekycSignature, ekycBody)).rejects.toBeInstanceOf(NotFoundException);
    expect(ekyc.handleWebhook).not.toHaveBeenCalled();
    const ekycFound = new EkycController(ekyc as never, ekycConfig, dataSourceReturning([{ tenant_id: TENANT_B }]));
    await expect(ekycFound.webhook(SEED, ekycSignature, ekycBody)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ekycFound.webhook(TENANT_B, ekycSignature, ekycBody)).resolves.toEqual({ meta: { tenantId: TENANT_B } });

    const marketplace = {
      findPartnerByCategory: jest.fn(async () => null),
      recordDelivery: jest.fn(async () => undefined),
    };
    const notaryMissing = new NotaryConnectorController(marketplace as never, dataSourceReturning([]));
    await expect(
      notaryMissing.handleWebhook('', {
        bookingId: 'bk_missing',
        notarizationStatus: 'COMPLETED',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(marketplace.recordDelivery).not.toHaveBeenCalled();
    const notaryFound = new NotaryConnectorController(
      marketplace as never,
      dataSourceReturning([{ tenant_id: TENANT_B }]),
    );
    await expect(
      notaryFound.handleWebhook(SEED, { bookingId: 'bk_b', notarizationStatus: 'COMPLETED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await notaryFound.handleWebhook(TENANT_B, { bookingId: 'bk_b', notarizationStatus: 'COMPLETED' });
    expect(marketplace.recordDelivery).toHaveBeenCalledWith(expect.objectContaining({ tenantId: TENANT_B }));
    expect(JSON.stringify(marketplace.recordDelivery.mock.calls)).not.toContain(SEED);
  });

  it('simulate rail requires a user tenant or one stored externalRef', async () => {
    const rails = { assertSimulateAllowed: jest.fn(async () => undefined) };
    const missing = new SimulateRailGuard(rails as never, dataSourceReturning([]));
    await expect(
      missing.canActivate(httpContext({ headers: { 'x-tenant-id': SEED }, body: {}, user: undefined })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(rails.assertSimulateAllowed).not.toHaveBeenCalled();

    const found = new SimulateRailGuard(rails as never, dataSourceReturning([{ tenant_id: TENANT_B }]));
    await expect(
      found.canActivate(
        httpContext({ headers: { 'x-tenant-id': SEED }, body: { externalRef: 'kyc_b' }, user: undefined }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      found.canActivate(
        httpContext({ headers: { 'x-tenant-id': TENANT_B }, body: { externalRef: 'kyc_b' }, user: undefined }),
      ),
    ).resolves.toBe(true);
    expect(rails.assertSimulateAllowed).toHaveBeenCalledWith(TENANT_B);
    expect(rails.assertSimulateAllowed).not.toHaveBeenCalledWith(SEED);
  });
});
