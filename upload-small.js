import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

// Temporary private server-upload route for lecture files up to 2.5 MiB.
// JSON/base64 avoids dependency on multipart parsers; Vercel's 4.5 MB body limit still applies.
const MAX_BYTES = Math.floor(2.5 * 1024 * 1024);
const EXT_TO_MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const allowedOrigin = origin => !origin || origin === 'https://cybersecurity22-design.github.io' || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (!allowedOrigin(origin)) return res.status(403).json({ error: 'المصدر غير مسموح.' });
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'الطريقة غير مسموحة.' });
  // Reject oversized bodies before decoding. A 2.5 MiB upload is ~3.34 MiB base64.
  if (Number(req.headers['content-length'] || 0) > 3_700_000) {
    return res.status(413).json({ error: 'الحد المؤقت هو 2.5MB.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { ext, data } = body || {};
    if (!Object.hasOwn(EXT_TO_MIME, ext) || typeof data !== 'string' || data.length === 0 || data.length > 3_500_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      return res.status(400).json({ error: 'الملف غير صالح؛ ارفع PDF أو DOCX أو PPTX.' });
    }
    const file = Buffer.from(data, 'base64');
    if (!file.length || file.length > MAX_BYTES) return res.status(413).json({ error: 'الحد المؤقت هو 2.5MB.' });
    if (ext === 'pdf' && file.subarray(0, 5).toString('ascii') !== '%PDF-') return res.status(400).json({ error: 'ملف PDF غير صالح.' });
    if (ext !== 'pdf' && file.subarray(0, 2).toString('ascii') !== 'PK') return res.status(400).json({ error: 'ملف Office غير صالح.' });
    const pathname = `student-uploads/${randomUUID()}/lecture.${ext}`;
    const blob = await put(pathname, file, {
      access: 'private',
      addRandomSuffix: false,
      contentType: EXT_TO_MIME[ext],
    });
    return res.status(200).json({ pathname: blob.pathname });
  } catch (error) {
    console.error('Private server upload failed:', error?.name, error?.message);
    return res.status(502).json({ error: 'فشل الرفع إلى التخزين الخاص. راجع سجلات Vercel.' });
  }
}
