import assert from 'node:assert/strict';
import test from 'node:test';

import { WeChatConverter, previewHtml } from './converter.js';

test('WeChatConverter flattens unordered lists into paragraph-based bullets for WeChat compatibility', () => {
  const converter = new WeChatConverter();
  const markdown = [
    '# Harness 为什么重要',
    '',
    '比如：',
    '',
    '- 上下文太长，不一定要换更贵模型。',
    '- 输出不稳定，不一定是智商不够。',
    '- 多 Agent 协作混乱，不一定是编排框架差。',
    '',
  ].join('\n');

  const result = converter.convert(markdown);

  assert.doesNotMatch(result.html, /<ul\b/i);
  assert.doesNotMatch(result.html, /<li\b/i);
  assert.match(result.html, /•<\/span>上下文太长，不一定要换更贵模型。/);
  assert.match(result.html, /•<\/span>输出不稳定，不一定是智商不够。/);
  assert.match(result.html, /•<\/span>多 Agent 协作混乱，不一定是编排框架差。/);
});

test('previewHtml can render a cover image before the article body', () => {
  const converter = new WeChatConverter();
  const html = previewHtml(
    '<section><p>正文第一段</p></section>',
    converter.getTheme(),
    'file:///tmp/article/',
    'cover.png',
  );

  assert.match(html, /<img class="preview-cover-image" src="cover\.png" alt="封面图"/);
  assert.ok(html.indexOf('preview-cover-image') < html.indexOf('正文第一段'));
});

test('previewHtml does not duplicate cover when the body already renders the same image', () => {
  const converter = new WeChatConverter();
  const html = previewHtml(
    '<section><p><img src="cover.png" alt="封面"></p><p>正文第一段</p></section>',
    converter.getTheme(),
    'file:///tmp/article/',
    'cover.png',
  );

  assert.doesNotMatch(html, /<img class="preview-cover-image"/);
  assert.match(html, /<img src="cover\.png" alt="封面"/);
});
