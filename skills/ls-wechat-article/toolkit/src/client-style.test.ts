import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePublishAuthor } from './client-style.js';

test('resolvePublishAuthor prefers CLI author, then client style author, then config author', () => {
  assert.equal(resolvePublishAuthor('CLI 作者', 'Config 作者', { author: 'Style 作者' }), 'CLI 作者');
  assert.equal(resolvePublishAuthor(undefined, 'Config 作者', { author: 'Style 作者' }), 'Style 作者');
  assert.equal(resolvePublishAuthor(undefined, undefined, { author: 'Style 作者' }), 'Style 作者');
  assert.equal(resolvePublishAuthor(undefined, undefined, {}), undefined);
});
