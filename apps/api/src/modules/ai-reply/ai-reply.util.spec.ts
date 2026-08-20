import { composeSalesReply } from './ai-reply.util';

describe('ai-reply.util', () => {
  it('drafts friendly reply with price intent', () => {
    const draft = composeSalesReply({
      inboundMessage: 'Cho em hỏi giá căn 2PN',
      leadName: 'Minh',
      unitCode: 'A-1205',
      projectName: 'Sunrise Tower',
    });
    expect(draft.replyText).toContain('Minh');
    expect(draft.replyText.toLowerCase()).toContain('giá');
    expect(draft.suggestedActions.length).toBeGreaterThan(0);
  });
});
