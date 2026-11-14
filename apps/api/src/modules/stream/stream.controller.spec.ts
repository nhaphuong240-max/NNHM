import { UnprocessableEntityException } from '@nestjs/common';
import { StreamController } from './stream.controller';

describe('unit status stream', () => {
  it('returns 422 when a signed-in user omits unitId and subscribes when unitId is present', async () => {
    const streamEvents = { subscribeUnits: jest.fn(() => 'stream') };
    const controller = new StreamController(streamEvents as never, { get: () => undefined } as never, {} as never);
    const user = { userId: 'usr_1', tenantId: 'ten_a', email: 'a@nnhn.local', role: 'AGENT' };
    await expect(controller.units(user, undefined, undefined, undefined)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(streamEvents.subscribeUnits).not.toHaveBeenCalled();
    await expect(controller.units(user, undefined, ' un_1 ', undefined)).resolves.toBe('stream');
    expect(streamEvents.subscribeUnits).toHaveBeenCalledWith('ten_a', 'un_1');
  });
});
