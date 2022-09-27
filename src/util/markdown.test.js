/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */

import { markdown } from './markdown';

function mdTest(source, plain, html) {
  test(source, () => {
    if (html === undefined) {
      html = plain;
      plain = source;
    }
    const content = markdown(source, { kind: 'edit' });
    expect(content.plain).toBe(plain);
    expect(content.html).toBe(html);
  });
}

describe('text', () => {
  mdTest('some text', 'some text');

  mdTest('text\nwith\nnewlines', 'text<br>with<br>newlines');

  mdTest('text\n\nwith many\n\n\nnewlines', 'text<br><br>with many<br><br><br>newlines');

  mdTest('¯\\_(ツ)_/¯', '¯\\\\_(ツ)\\_/¯', '¯\\_(ツ)_/¯');
  // TODO: mdTest('¯\\_(ツ)_/¯', '¯\\_(ツ)_/¯');
});

describe('inline', () => {
  mdTest('*italic* or _italic_', '_italic_ or _italic_', '<em>italic</em> or <em>italic</em>');
  mdTest('**bold**', '<strong>bold</strong>');
  mdTest('__underline__', '<u>underline</u>');
  mdTest('~~strikethrough~~', '<del>strikethrough</del>');
  mdTest('||spoiler||', '<span data-mx-spoiler>spoiler</span>');
  mdTest('||spoiler||(reason)', '<span data-mx-spoiler="reason">spoiler</span>');
});

describe('code', () => {
  mdTest('`inline`', '<code>inline</code>');

  mdTest('```\nprint(1)\n```', '<pre><code>print(1)</code></pre>');
  mdTest('```\nprint(1)```', '```\nprint(1)\n```', '<pre><code>print(1)</code></pre>');
  mdTest('```python\nprint(1)\n```', '<pre><code class="language-python">print(1)</code></pre>');
});

describe('math', () => {
  mdTest('$inline$', '<span data-mx-maths="inline"><code>inline</code></span>');

  mdTest('$$display$$', '<div data-mx-maths="display"><code>display</code></div>');
  mdTest('$$\ndisplay\n$$', '$$display$$', '<div data-mx-maths="display"><code>display</code></div>');
  mdTest('$$multi\nline$$', '$$\nmulti\nline\n$$', '<div data-mx-maths="multi\nline"><code>multi\nline</code></div>');
  mdTest('$$\nmulti\nline\n$$', '<div data-mx-maths="multi\nline"><code>multi\nline</code></div>');
});

describe('heading', () => {
  mdTest('# heading', '<h1>heading</h1>');
  mdTest('## sub-heading', '<h2>sub-heading</h2>');

  mdTest('heading\n===', '# heading', '<h1>heading</h1>');
  mdTest('sub-heading\n---', '## sub-heading', '<h2>sub-heading</h2>');

  mdTest('###### small heading', '<h6>small heading</h6>');
});

describe('link', () => {
  mdTest('example.com', 'example.com');
  mdTest('http://example.com', 'http://example.com');
  mdTest('https://example.com', 'https://example.com');
  mdTest('mailto:mail@example.com', 'mailto:mail@example.com');
  mdTest('tel:911', 'tel:911');

  mdTest('<https://example.com>', 'https://example.com', 'https://example.com');
  mdTest('[https://example.com](https://example.com)', 'https://example.com', 'https://example.com');
  mdTest('[example](https://example.com)', '<a href="https://example.com">example</a>');

  mdTest('[empty]()', '<a href="">empty</a>');
});

describe('blockquote', () => {
  mdTest('> quote', '<blockquote>quote</blockquote>');
  mdTest('>quote', '> quote', '<blockquote>quote</blockquote>');
  mdTest('>    quote', '> quote', '<blockquote>quote</blockquote>');

  mdTest('> multiline\nquote', '> multiline\n> quote', '<blockquote>multiline<br>quote</blockquote>');

  mdTest('> quote\n\ntext after', '<blockquote>quote</blockquote>text after');
});
