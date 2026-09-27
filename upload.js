import { handleUpload } from '@vercel/blob/client';
const MAX=50*1024*1024;
const ALLOWED=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
function allowed(origin) {return !origin||origin==='https://cybersecurity22-design.github.io'||/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);}
export default async function handler(req,res) {
  const origin=req.headers.origin;
  if(!allowed(origin))return res.status(403).json({error:'المصدر غير مسموح.'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({error:'الطريقة غير مسموحة.'});
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({error:'طلب رفع غير صالح'});
    const result=await handleUpload({body,request:req,
      onBeforeGenerateToken:async(pathname)=>{
        if(!/^student-uploads\/[0-9a-f-]{36}\/lecture\.(pdf|docx|pptx)$/.test(pathname))throw new Error('مسار ملف غير مسموح.');
        // Restrict token size and types on Vercel Blob itself.
        return {allowedContentTypes:ALLOWED,maximumSizeInBytes:MAX,validUntil:Date.now()+10*60*1000,addRandomSuffix:false};
      },
      onUploadCompleted:async()=>{},
    });
    return res.status(200).json(result);
  }catch(e){
    // Detailed error is logged ONLY server-side; never return secrets to students.
    console.error('Blob upload rejected:', { name:e?.name, message:e?.message, stack:e?.stack, cause:e?.cause });
    return res.status(400).json({error:'فشل تصريح رفع الملف. راجع Vercel Logs لمعرفة السبب.'});
  }
}
