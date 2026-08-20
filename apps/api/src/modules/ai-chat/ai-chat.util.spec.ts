import { detectChatIntent } from './ai-chat.util';

describe('ai-chat.util', () => {
  it('detects price intent', () => {
    expect(detectChatIntent('Cho hỏi giá căn 2PN')).toBe('price');
  });

  it('detects visit intent', () => {
    expect(detectChatIntent('Muốn đi xem nhà cuối tuần')).toBe('visit');
  });
});
