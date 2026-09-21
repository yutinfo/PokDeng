// Vercel Serverless Function: ส่ง Firebase web config จาก environment variables
// ตั้งค่าใน Vercel Dashboard > Project > Settings > Environment Variables
// ค่าเหล่านี้เป็น public web config ของ Firebase (ไม่ใช่ secret) ความปลอดภัยอยู่ที่ database rules
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    apiKey: process.env.FIREBASE_API_KEY || null,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || null,
    databaseURL: process.env.FIREBASE_DATABASE_URL || null,
    projectId: process.env.FIREBASE_PROJECT_ID || null,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || null,
    appId: process.env.FIREBASE_APP_ID || null,
  });
}
