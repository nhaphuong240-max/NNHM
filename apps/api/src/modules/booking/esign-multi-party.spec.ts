import { allSignersSigned, hashDocumentText, signerTurn } from './esign-multi-party';

describe('esign multi-party turns', () => {
  const buyer = { id: 's1', signOrder: 1, groupId: 'g1', status: 'LINK_SENT' };
  const sales = { id: 's2', signOrder: 2, groupId: 'g2', status: 'PENDING' };

  it('blocks a later sequential signer until earlier ones are SIGNED', () => {
    expect(signerTurn({ mode: 'SEQUENTIAL', signer: sales, roster: [buyer, sales] })).toBe('not-turn');
    expect(
      signerTurn({
        mode: 'SEQUENTIAL',
        signer: sales,
        roster: [{ ...buyer, status: 'SIGNED' }, sales],
      }),
    ).toBe('ok');
  });

  it('lets the same group sign in parallel without waiting on completion order', () => {
    const a = { id: 'a', signOrder: 1, groupId: 'legal', status: 'LINK_SENT' };
    const b = { id: 'b', signOrder: 1, groupId: 'legal', status: 'LINK_SENT' };
    expect(signerTurn({ mode: 'SEQUENTIAL', signer: b, roster: [a, b] })).toBe('ok');
    expect(signerTurn({ mode: 'PARALLEL', signer: sales, roster: [buyer, sales] })).toBe('ok');
  });

  it('hashes the frozen document independently of signer completion order', () => {
    const hash = hashDocumentText('body');
    expect(hashDocumentText('body')).toBe(hash);
    expect(hashDocumentText('body-changed')).not.toBe(hash);
    expect(allSignersSigned([buyer, sales])).toBe(false);
    expect(allSignersSigned([{ ...buyer, status: 'SIGNED' }, { ...sales, status: 'SIGNED' }])).toBe(true);
  });
});
