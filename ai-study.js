/* If you also use GitHub Pages, set your stable Vercel production domain below. */
const STUDY_API_URL = location.hostname.endsWith('github.io')
  ? 'https://your-assistant-in-the-field-of-cybersecurity-9hv9lw9ah.vercel.app/api/study'
  : '/api/study';
(() => {
  const form = document.getElementById('ai-form');
  if (!form) return;
  const upload = document.getElementById('ai-file');
  const submit = document.getElementById('ai-submit');
  const status = document.getElementById('ai-status');
  const result = document.getElementById('ai-result');
  const output = document.getElementById('ai-output');
  let answer = '';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = upload.files?.[0];
    const task = new FormData(form).get('task');
    if (!file || !['summary', 'questions', 'both'].includes(task)) {
      status.textContent = 'اختار الملف والعملية أولًا.';
      return;
    }
    if (!/\.(pdf|docx|pptx)$/i.test(file.name) || file.size > 3 * 1024 * 1024 || file.size === 0) {
      status.textContent = 'ارفع ملف PDF أو DOCX أو PPTX لا يتجاوز 3 ميغابايت.';
      return;
    }
    submit.disabled = true;
    status.textContent = 'جاري قراءة الملف وتحضير النتيجة… قد تستغرق العملية دقيقة.';
    result.classList.remove('is-visible');
    answer = '';
    try {
      const data = new FormData();
      data.append('file', file, file.name);
      data.append('task', task);
      const response = await fetch(STUDY_API_URL, { method: 'POST', body: data });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('تعذر قراءة استجابة الخادم.'); }
      if (!response.ok) throw new Error(payload.error || 'حدث خطأ، جرّب مرة ثانية.');
      answer = payload.result;
      output.textContent = answer; // never parse AI output as HTML
      output.dir = /[\u0600-\u06ff]/.test(answer.slice(0, 250)) ? 'rtl' : 'auto';
      result.classList.add('is-visible');
      status.textContent = 'خلص! تم إنشاء النتيجة بنجاح.';
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? 'تعذر الاتصال بالخادم. تأكد من نشر ملفات API على Vercel ورابط موقعك.'
        : error.message;
    } finally { submit.disabled = false; }
  });
  document.getElementById('ai-copy').addEventListener('click', async () => {
    if (!answer) return;
    try { await navigator.clipboard.writeText(answer); status.textContent = 'تم نسخ النتيجة.'; }
    catch { status.textContent = 'تعذر النسخ؛ يمكنك تحديد النص ونسخه يدويًا.'; }
  });
  document.getElementById('ai-download').addEventListener('click', () => {
    if (!answer) return;
    const url = URL.createObjectURL(new Blob([answer], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'study-result.txt'; link.click();
    URL.revokeObjectURL(url);
  });
})();
