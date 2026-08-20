import { signWebhookPayload, verifyWebhookSignature } from './webhook-signature.util';

describe('webhook-signature', () => {
  const secret = 'test-secret';

  it('signs and verifies canonical payload', () => {
    const payload = {
      eventId: 'evt_01',
      eventType: 'payment.success',
      transactionId: 'TXN_01',
      amount: 50_000_000,
      paymentIntentId: 'pi_01',
    };
    const signature = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, 'bad-signature', secret)).toBe(false);
  });

  it('ignores signature field in body when signing', () => {
    const payload = {
      eventId: 'evt_02',
      eventType: 'payment.success',
      transactionId: 'TXN_02',
      amount: 1,
      paymentIntentId: 'pi_02',
      signature: 'should-be-ignored',
    };
    const { signature: _ignored, ...withoutSig } = payload;
    const sig = signWebhookPayload(payload, secret);
    expect(verifyWebhookSignature(withoutSig, sig, secret)).toBe(true);
  });
});
