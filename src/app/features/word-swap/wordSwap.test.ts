import { describe, expect, it, vi } from 'vitest';
import { fetchWordSwaps, matchCase, swapHtml, swapText, swappedWords } from './wordSwap';

const swaps = [
  { from: 'foo', to: 'bar' },
  { from: 'olá', to: 'tchau' },
];

describe('swapText', () => {
  it('swaps whole words in any case and keeps the typed case', () => {
    expect(swapText('Foo, foo and FOO! food', swaps)).toEqual({
      text: 'Bar, bar and BAR! food',
      words: ['Bar', 'bar', 'BAR'],
    });
  });

  it('handles accents and leaves text alone without swaps', () => {
    expect(swapText('olá olás', swaps).text).toBe('tchau olás');
    expect(swapText('foo', [])).toEqual({ text: 'foo', words: [] });
  });
});

describe('matchCase', () => {
  it('copies upper, capitalized and lower case', () => {
    expect([
      matchCase('HELLO', 'bye'),
      matchCase('Hello', 'bye'),
      matchCase('hEllo', 'bye'),
    ]).toEqual(['BYE', 'Bye', 'bye']);
    expect(matchCase('F', 'bar')).toBe('Bar');
  });
});

describe('swapHtml', () => {
  it('highlights swapped words in text but not in tags, mentions or code', () => {
    const html =
      '<b>foo</b> <a href="https://matrix.to/#/@foo:x">foo</a> <code>foo</code> <img alt="foo"> foo';
    expect(swapHtml(html, swaps)).toBe(
      '<b><span data-mx-bg-color="#FFD400" data-mx-color="#1A1A1A">bar</span></b> ' +
        '<a href="https://matrix.to/#/@foo:x">foo</a> <code>foo</code> <img alt="foo"> ' +
        '<span data-mx-bg-color="#FFD400" data-mx-color="#1A1A1A">bar</span>'
    );
  });

  it('escapes the replacement', () => {
    expect(swapHtml('foo', [{ from: 'foo', to: '<b>' }])).toContain('&lt;b&gt;');
  });
});

describe('swappedWords', () => {
  it('reads the tag from message content', () => {
    expect(swappedWords({ 'com.blazeroom.swapped': ['bar', 3] })).toEqual(['bar']);
    expect(swappedWords({ body: 'x' })).toEqual([]);
  });
});

describe('fetchWordSwaps', () => {
  it('reads the swaps from the API', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ swaps }), { status: 200 }));
    expect(await fetchWordSwaps(() => 'tok', fetchImpl)).toEqual(swaps);
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/word-swaps');
  });
});
