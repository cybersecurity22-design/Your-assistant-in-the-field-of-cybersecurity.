(() => {
  'use strict';
  const endpoint = 'https://api.github.com/repos/cybersecurity22-design/Your-assistant-in-the-field-of-cybersecurity./contents/content.json';
  let lastCheck = 0;
  const element = (tag, text) => { const node = document.createElement(tag); if (text != null) node.textContent = text; return node; };
  const validLink = link => typeof link === 'string' && /^https:\/\//i.test(link);
  async function fetchLatest() {
    // Read directly from the public GitHub repository so admin changes show up
    // without waiting for a Vercel rebuild. Fall back to deployed JSON if GitHub
    // is temporarily unavailable or its anonymous API rate limit is reached.
    try {
      const response = await fetch(endpoint + '?t=' + Date.now(), { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('GitHub API ' + response.status);
      const file = await response.json();
      if (!file.content) throw new Error('GitHub response missing file content');
      const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (githubError) {
      console.warn('تعذر جلب تحديثات GitHub؛ محاولة تحميل نسخة الموقع.', githubError);
      const local = await fetch('./content.json?t=' + Date.now(), { cache: 'no-store' });
      if (!local.ok) throw new Error('Local content HTTP ' + local.status);
      return local.json();
    }
  }
  function render(data) {
    if (!Array.isArray(data.groups) || !Array.isArray(data.years)) throw new Error('بيانات غير صالحة');
    const explanations = document.getElementById('explanations');
    const plan = document.getElementById('study-plan');
    if (!explanations || !plan) throw new Error('تعذر العثور على أقسام الموقع');
    const newGroups = document.createDocumentFragment();
    for (const group of data.groups) {
      const section = element('section'); section.className = 'explain-group';
      section.append(element('h2', group.title));
      const list = element('ul'); list.className = 'explain-list';
      for (const item of (group.items || [])) {
        const li = element('li'), link = element('a', 'مشاهدة الشرح ↗');
        li.append(element('span', item.name));
        if (validLink(item.url)) {
          link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
          li.append(link);
        }
        list.append(li);
      }
      section.append(list); newGroups.append(section);
    }
    const newYears = document.createDocumentFragment();
    for (const year of data.years) {
      const section = element('section'); section.className = 'year'; section.append(element('h2', year.name));
      const scroll = element('div'); scroll.className = 'table-scroll'; scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', 'مواد ' + year.name); scroll.tabIndex = 0;
      const table = element('table'), thead = element('thead'), heads = element('tr'), tbody = element('tbody'), row = element('tr');
      for (const term of (year.terms || [])) {
        const th = element('th', term.name); th.scope = 'col'; heads.append(th);
        const td = element('td'), ul = element('ul');
        for (const name of (term.items || [])) ul.append(element('li', name));
        td.append(ul); row.append(td);
      }
      thead.append(heads); tbody.append(row); table.append(thead, tbody); scroll.append(table); section.append(scroll); newYears.append(section);
    }
    // Only replace the static fallback content after everything has been parsed.
    explanations.querySelectorAll('.explain-group').forEach(n => n.remove());
    explanations.append(newGroups);
    plan.querySelectorAll('.year').forEach(n => n.remove());
    plan.append(newYears);
    const pdf = document.querySelector('#materials .drive');
    if (pdf && validLink(data.pdfUrl)) pdf.href = data.pdfUrl;
    document.dispatchEvent(new Event('site-content-updated'));
    const notice = document.getElementById('content-sync-warning');
    if (notice) notice.remove();
  }
  async function refresh() {
    lastCheck = Date.now();
    try { render(await fetchLatest()); }
    catch (error) {
      console.warn('تعذر تحميل المحتوى المحدث؛ بقيت الشروحات الموجودة.', error);
      if (!document.getElementById('content-sync-warning')) {
        const notice = element('p', 'تعذر جلب آخر تحديث للشروحات حالياً. حاول تحديث الصفحة لاحقاً.');
        notice.id = 'content-sync-warning'; notice.setAttribute('role', 'status');
        notice.style.cssText = 'padding:12px;border:1px solid #bf7b37;border-radius:10px;background:#fff5e8;color:#713c0a';
        document.getElementById('explanations')?.append(notice);
      }
    }
  }
  refresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastCheck > 120000) refresh(); });
  window.addEventListener('focus', () => { if (Date.now() - lastCheck > 120000) refresh(); });
})();
