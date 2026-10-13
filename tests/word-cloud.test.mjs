import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function getFunctions() {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match, 'inline app JavaScript must exist');
  const stub = {
    textContent: '',
    addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  };
  const context = {
    document: { getElementById() { return stub; } },
    window: { addEventListener() {} },
    console,
    Math,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(match[1], context, { filename: 'index.html' });
  return context;
}

test('frequency counter handles built-in JavaScript property names', async () => {
  const app = await getFunctions();
  const values = app.getFreq(['constructor', 'constructor', 'tostring', 'обычный']);
  assert.deepEqual(JSON.parse(JSON.stringify(values)), [
    ['constructor', 2], ['tostring', 1], ['обычный', 1]
  ]);
});

test('parser ignores stopwords but keeps valid words', async () => {
  const app = await getFunctions();
  assert.deepEqual(Array.from(app.parseWords(' И, Привет! ПРИВЕТ, работа. ')), ['привет', 'привет', 'работа']);
});

test('renderer list is capped without losing full statistics', async () => {
  const app = await getFunctions();
  const all = Array.from({ length: 1000 }, (_, i) => ['word' + i, 1000 - i]);
  const shown = app.limitRenderedWords(all);
  assert.equal(shown.length, 120);
  assert.equal(shown[0][0], 'word0');
  assert.equal(shown.at(-1)[0], 'word119');
  assert.equal(all.length, 1000);
});

test('inline script is valid JavaScript and can load without external modules', async () => {
  const app = await getFunctions();
  assert.equal(typeof app.launch, 'function');
  assert.equal(typeof app.renderCloud, 'function');
});
