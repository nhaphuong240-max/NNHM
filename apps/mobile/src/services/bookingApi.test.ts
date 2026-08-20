import { mapApiBooking } from './bookingApi';

describe('bookingApi', () => {
  it('mapApiBooking maps OpenAPI row shape', () => {
    const booking = mapApiBooking({
      id: 'bk_01',
      attributes: {
        status: 'RESERVED',
        unitId: 'un_01',
        leadId: 'ld_01',
        expiresAt: '2026-07-30T10:00:00.000Z',
        lockId: 'lock_bk_01',
        depositAmount: 50_000_000,
        createdAt: '2026-07-28T10:00:00.000Z',
      },
    });

    expect(booking.id).toBe('bk_01');
    expect(booking.lockId).toBe('lock_bk_01');
    expect(booking.status).toBe('RESERVED');
  });
});
