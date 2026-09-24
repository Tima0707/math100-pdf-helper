const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let click, downloads = [], urls = [], title = '';
const chrome = {
  action: { onClicked: {addListener: f => click = f}, setBadgeText: async () => {}, setTitle: async () => {} },
  scripting: {executeScript: async () => [{result: {urls, title}}]},
  downloads: {download: async options => downloads.push(options)}
};
vm.runInNewContext(fs.readFileSync(__dirname + '/background.js', 'utf8'), {chrome, URL});
(async () => {
  const tab = {id: 1, url: 'https://math100.ru/example/'};
  await click(tab);
  assert.equal(downloads.length, 0, 'No hardcoded PDF fallback');
  urls = ['https://pdf.math100.ru/pdf/example/wm.pdf'];
  title = 'ЕГЭ Профиль 2027 №10 с ответами и решениями. Рациональные уравнения и неравенства';
  await click(tab);
  assert.equal(downloads[0].filename, 'Math100/ЗАДАНИЯ №10 РАЦИОНАЛЬНЫЕ УРАВНЕНИЯ И НЕРАВЕНСТВА.pdf');
  urls.push('https://pdf.math100.ru/pdf/second/wm.pdf');
  await click(tab);
  assert.equal(downloads.length, 1, 'Do not choose arbitrarily among PDFs');
  await click({id: 2, url: 'https://evil.example/test.pdf'});
  assert.equal(downloads.length, 1, 'Reject foreign domain');
  await click({id: 3, url: 'https://pdf.math100.ru/pdf/example/wm.pdf'});
  assert.equal(downloads[1].filename, 'Math100/example.pdf');
  console.log('All tests passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
