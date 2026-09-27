import { handleUpload } from '@vercel/blob/client';
import { timingSafeEqual } from 'node:crypto';
const MAX=50*1024*1024;
const ALLOWED=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
function authorized(code) { const secret=process.env.STUDY_ACCESS_CODE; if(!secret||typeof code!=='string')return false; const a=Buffer.from(code),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b); }
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
  if(!process.env.STUDY_ACCESS_CODE)return res.status(503).json({error:'يجب إعداد STUDY_ACCESS_CODE.'});
  try {
    const result=await handleUpload({body:req.body,request:req,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        let payload={};try{payload=JSON.parse(clientPayload||'{}')}catch{}
        if(!authorized(payload.accessCode))throw new Error('رمز الدخول غير صحيح.');
        if(!/^student-uploads\/[0-9a-f-]{36}\/lecture\.(pdf|docx|pptx)$/.test(pathname))throw new Error('مسار ملف غير مسموح.');
        // Restrict token size and types on Vercel Blob itself.
        return {allowedContentTypes:ALLOWED,maximumSizeInBytes:MAX,validUntil:Date.now()+10*60*1000,addRandomSuffix:false};
      },
      onUploadCompleted:async()=>{},
    });
    return res.status(200).json(result);
  }catch(e){console.error('Blob upload rejected',e?.name);return res.status(400).json({error:'فشل تصريح الرفع. تحقق من الرمز ونوع الملف.'});}
}
