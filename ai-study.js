// Plain HTML frontend: upload privately through the Vercel Blob client SDK.
const API_BASE = location.hostname.endsWith('github.io')
  ? 'https://your-assistant-in-the-field-of-cybe.vercel.app'
  : '';
const MAX_FILE_BYTES=Math.floor(2.5*1024*1024); // Temporary Vercel private server-upload limit
const TYPE={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const form=document.getElementById('ai-form');if(!form)return;
 const uploadInput=document.getElementById('ai-file'),submit=document.getElementById('ai-submit');
 const status=document.getElementById('ai-status'),result=document.getElementById('ai-result'),output=document.getElementById('ai-output');
 const questionOptions=document.getElementById('ai-question-options');
 let answer='';
 form.querySelectorAll('[name="task"]').forEach(radio=>radio.addEventListener('change',()=>{
   questionOptions.hidden=radio.value==='summary';
 }));
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();const file=uploadInput.files?.[0],data=new FormData(form),task=data.get('task');
  const questionType=data.get('questionType'),questionCount=Number(data.get('questionCount'));
  const ext=file?.name?.split('.').pop()?.toLowerCase();
  if(!file||!['summary','questions','both'].includes(task)){status.textContent='ارفع الملف واختر العملية.';return;}
  if(!TYPE[ext]||!file.size||file.size>MAX_FILE_BYTES){status.textContent='ارفع PDF أو DOCX أو PPTX حتى 2.5MB مؤقتًا.';return;}
  if(task!=='summary'&&(!['mcq','true_false','short_answer','essay','mixed'].includes(questionType)||!Number.isInteger(questionCount)||questionCount<1||questionCount>30)){
   status.textContent='اختر نوع الأسئلة وعددها (1–30).';return;
  }
  submit.disabled=true;result.classList.remove('is-visible');answer='';
  try{
    status.textContent='جاري تجهيز الملف ورفعه بشكل خاص…';
    const data64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('تعذرت قراءة الملف.'));
      reader.onload=()=>resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
    const uploaded=await fetch(API_BASE+'/api/upload-small',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ext,data:data64}),
    });
    const uploadedData=await uploaded.json().catch(()=>({}));
    if(!uploaded.ok)throw new Error(uploadedData.error||'تعذر رفع الملف.');
    const blob={pathname:uploadedData.pathname};
    status.textContent='تم الرفع. جاري قراءة الملف وإنشاء النتيجة… قد تستغرق العملية عدة دقائق.';
    const response=await fetch(API_BASE+'/api/study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pathname:blob.pathname,task,questionType:task==='summary'?undefined:questionType,questionCount:task==='summary'?undefined:questionCount})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'حدث خطأ أثناء المعالجة.');
    answer=payload.result;output.textContent=answer;output.dir=/[\u0600-\u06ff]/.test(answer.slice(0,250))?'rtl':'auto';
    result.classList.add('is-visible');status.textContent='تم إنشاء النتيجة!';result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){status.textContent=error?.message||'تعذر رفع الملف أو معالجته.';}
  finally{submit.disabled=false;}
 });
 document.getElementById('ai-copy').addEventListener('click',async()=>{if(!answer)return;try{await navigator.clipboard.writeText(answer);status.textContent='تم النسخ.';}catch{status.textContent='تعذر النسخ.';}});
 document.getElementById('ai-download').addEventListener('click',async()=>{
  if(!answer)return;
  const format=document.getElementById('ai-format').value;
  const name='study-result';
  const download=(blob,filename)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  try{
   if(format==='txt')download(new Blob(['\ufeff'+answer],{type:'text/plain;charset=utf-8'}),name+'.txt');
   else if(format==='docx'){
     status.textContent='جاري تجهيز ملف Word…';
     const {Document,Packer,Paragraph,TextRun}=await import('https://esm.sh/docx@9.5.1');
     const rtl=/[\u0600-\u06ff]/.test(answer.slice(0,250));
     const paragraphs=answer.split(/\r?\n/).map(line=>new Paragraph({bidirectional:rtl,children:[new TextRun({text:line,rightToLeft:rtl})]}));
     const doc=new Document({sections:[{children:paragraphs}]});
     download(await Packer.toBlob(doc),name+'.docx');
   } else if(format==='pdf'){
     // Browser print preserves Arabic shaping much better than default PDF fonts.
     const win=window.open('','_blank');
     if(!win)throw new Error('اسمح بفتح نافذة الطباعة ثم حاول مرة أخرى.');
     const rtl=/[\u0600-\u06ff]/.test(answer.slice(0,250));
     win.document.write('<!doctype html><html lang="'+(rtl?'ar':'en')+'" dir="'+(rtl?'rtl':'ltr')+'"><head><meta charset="utf-8"><title>Study result</title><style>body{font:16px/1.8 Arial,Tahoma,sans-serif;margin:36px;color:#111}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}@media print{body{margin:12mm}}</style></head><body><pre>'+escapeHtml(answer)+'</pre></body></html>');
     win.document.close();win.focus();win.print();
     status.textContent='اختر «Save as PDF / حفظ كـ PDF» من نافذة الطباعة.';
     return;
   }
   status.textContent='تم تجهيز الملف.';
  }catch(e){status.textContent=e.message||'تعذر إنشاء الملف؛ جرّب TXT.';}
 });
})();
