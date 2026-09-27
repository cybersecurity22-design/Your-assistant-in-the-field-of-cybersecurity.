(() => {
  'use strict';
  const endpoint = 'https://api.github.com/repos/cybersecurity22-design/Your-assistant-in-the-field-of-cybersecurity./contents/content.json';
  let lastCheck = 0;
  const element = (tag, text) => { const node = document.createElement(tag); if (text != null) node.textContent = text; return node; };
  async function refresh() {
    lastCheck = Date.now();
    try {
      const response = await fetch(endpoint + '?t=' + Date.now(), {headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if (!response.ok) throw new Error('GitHub API ' + response.status);
      const file = await response.json();
      const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')), c => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!Array.isArray(data.groups) || !Array.isArray(data.years)) throw new Error('بيانات غير صالحة');
      const pdf = document.querySelector('#materials .drive');
      if (pdf && /^https:\/\//.test(data.pdfUrl)) pdf.href = data.pdfUrl;
      const explanations = document.querySelector('#explanations');
      explanations.querySelectorAll('.explain-group').forEach(n => n.remove());
      for (const group of data.groups) {
        const section = element('section'); section.className = 'explain-group';
        section.append(element('h2',group.title)); const list = element('ul'); list.className = 'explain-list';
        for (const item of group.items) {
          const li = element('li'), link = element('a','مشاهدة الشرح ↗');
          li.append(element('span',item.name));
          if (/^https:\/\//.test(item.url)) {link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';}
          li.append(link);list.append(li);
        }
        section.append(list);explanations.append(section);
      }
      const plan = document.querySelector('#study-plan');
      plan.querySelectorAll('.year').forEach(n => n.remove());
      for (const year of data.years) {
        const section=element('section');section.className='year';section.append(element('h2',year.name));
        const scroll=element('div');scroll.className='table-scroll';scroll.setAttribute('role','region');scroll.setAttribute('aria-label','مواد '+year.name);scroll.tabIndex=0;
        const table=element('table'),thead=element('thead'),heads=element('tr'),tbody=element('tbody'),row=element('tr');
        for(const term of year.terms){const th=element('th',term.name);th.scope='col';heads.append(th);const td=element('td'),ul=element('ul');for(const name of term.items)ul.append(element('li',name));td.append(ul);row.append(td);}
        thead.append(heads);tbody.append(row);table.append(thead,tbody);scroll.append(table);section.append(scroll);plan.append(section);
      }
    } catch (error) { console.warn('تعذر تحميل آخر تحديث؛ تم إبقاء المحتوى الأصلي.',error); }
  }
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && Date.now()-lastCheck>120000)refresh();});
})();
