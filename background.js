
function pdfURL(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol === 'https:' && u.hostname === 'pdf.math100.ru' && /\.pdf$/i.test(u.pathname) && !u.username && !u.password) return u.href;
  } catch (_) {}
  return null;
}

function filenameTitle(title) {
  let text = String(title || '').replace(/\s+/g, ' ').trim();
  text = text.replace(/\s*[—–|]\s*math100\.ru.*$/i, '');
  const match = text.match(/№\s*(\d+)\s*(?:с ответами и решениями)?[.\s:—–-]*(.+)$/i);
  if (match) text = `ЗАДАНИЯ №${match[1]} ${match[2]}`;
  text = text.toUpperCase().replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim();
  text = [...text].slice(0, 95).join('').replace(/[. ]+$/g, '');
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(text)) text = '_' + text;
  return text;
}

async function status(tabId, text, title) {
  await chrome.action.setBadgeText({tabId, text});
  await chrome.action.setTitle({tabId, title});
}

chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    await status(tab.id, '…', 'Поиск PDF…');
    let url = pdfURL(tab.url);
    let title = "";
    const page = new URL(tab.url);
    if (!url && page.protocol === 'https:' && ['math100.ru', 'www.math100.ru'].includes(page.hostname)) {
      let results = [];
      try {
        results = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          func: () => {
            const values = [];
            for (const el of document.querySelectorAll('iframe,embed,object,a')) {
              for (const attr of ['src','data','href']) {
                const value = el.getAttribute(attr);
                if (value) values.push(new URL(value, location.href).href);
              }
            }
            values.push(...performance.getEntriesByType('resource').map(e => e.name));
            const found = [];
            for (const value of values) {
              found.push(value);
              try { found.push(...new URL(value).searchParams.values()); } catch (_) {}
            }
            return {urls: found, title: document.querySelector('h1')?.textContent || document.title};
          }
        });
      } catch (_) {}
      title = results[0]?.result?.title || tab.title || '';
      const candidates = [...new Set(results.flatMap(r => r.result?.urls || []).map(pdfURL).filter(Boolean))];
      if (candidates.length > 1) {
        await status(tab.id, '?', 'Найдено несколько PDF. Открой нужный PDF отдельно и нажми значок.');
        return;
      }
      url = candidates[0];
    }
    if (!url) {
      await status(tab.id, '?', 'PDF не найден. Открой прямую ссылку на PDF и нажми значок снова.');
      return;
    }
    const id = new URL(url).pathname.split('/').slice(-2, -1)[0];
    const safeId = (id || 'document').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const name = filenameTitle(title) || safeId;
    await chrome.downloads.download({url, filename: `Math100/${name}.pdf`, conflictAction: 'uniquify', saveAs: false});
    await status(tab.id, '↓', 'Загрузка начата. Результат — в загрузках браузера (Ctrl+J).');
  } catch (error) {
    await status(tab.id, '!', 'Не удалось начать загрузку. Открой PDF и повтори. Подробности — в загрузках браузера.');
  }
});
