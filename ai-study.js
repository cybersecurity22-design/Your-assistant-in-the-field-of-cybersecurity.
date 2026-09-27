// The frontend uses the official Blob client SDK via ESM CDN because this site is plain HTML without a bundler.
const API_BASE = location.hostname.endsWith('github.io')
  ? 'https://your-assistant-in-the-field-of-cybersecurity-9hv9lw9ah.vercel.app'
  : '';
const MAX_FILE_BYTES=50*1024*1024;
const TYPE={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
(async()=>{
 const form=document.getElementById('ai-form');if(!form)return;
 const uploadInput=document.getElementById('ai-file'), submit=document.getElementById('ai-submit');
 const status=document.getElementById('ai-status'), result=document.getElementById('ai-result'), output=document.getElementById('ai-output');
 let answer='';
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();const file=uploadInput.files?.[0];const task=new FormData(form).get('task');const accessCode=document.getElementById('ai-access-code')?.value||'';
  const ext=file?.name?.split('.').pop()?.toLowerCase();
  if(!file||!['summary','questions','both'].includes(task)){status.textContent='ارفع الملف واختر العملية.';return;}
  if(!TYPE[ext]||file.size===0||file.size>MAX_FILE_BYTES){status.textContent='ارفع PDF أو DOCX أو PPTX حتى 50MB.';return;}
  if(!accessCode){status.textContent='أدخل رمز دخول المساعد.';return;}
  submit.disabled=true;result.classList.remove('is-visible');answer='';
  try{
    status.textContent='جاري تجهيز رفع الملف…';
    const {upload}=await import('https://esm.sh/@vercel/blob@2.5.0/client');
    const pathname=`student-uploads/${crypto.randomUUID()}/lecture.${ext}`;
    const blob=await upload(pathname,file,{
      access:'private',handleUploadUrl:API_BASE+'/api/upload',contentType:TYPE[ext],multipart:true,
      clientPayload:JSON.stringify({accessCode}),
      onUploadProgress:({percentage})=>{status.textContent=`جاري رفع الملف: ${Math.round(percentage)}%`;},
    });
    status.textContent='تم الرفع. جاري قراءة الملف وإنشاء النتيجة… قد تستغرق العملية عدة دقائق.';
    const response=await fetch(API_BASE+'/api/study',{method:'POST',headers:{'Content-Type':'application/json','X-Study-Code':accessCode},body:JSON.stringify({pathname:blob.pathname,task})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'حدث خطأ أثناء المعالجة.');
    answer=payload.result;output.textContent=answer;output.dir=/[\u0600-\u06ff]/.test(answer.slice(0,250))?'rtl':'auto';
    result.classList.add('is-visible');status.textContent='تم إنشاء النتيجة!';result.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){status.textContent=error?.message||'تعذر رفع الملف أو معالجته.';}
  finally{submit.disabled=false;}
 });
 document.getElementById('ai-copy').addEventListener('click',async()=>{if(!answer)return;try{await navigator.clipboard.writeText(answer);status.textContent='تم النسخ.';}catch{status.textContent='تعذر النسخ.';}});
 document.getElementById('ai-download').addEventListener('click',()=>{if(!answer)return;const url=URL.createObjectURL(new Blob([answer],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='study-result.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();
