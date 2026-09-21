# 🃏 ป๊อกเด้งออนไลน์

เกมป๊อกเด้งเล่นกับเพื่อนแบบเรียลไทม์บนเบราว์เซอร์ ใช้ไพ่ CSS + emoji และชิปเสมือนเท่านั้น ไม่มีเงินจริงและไม่มี build step

## ตั้งค่า Firebase

1. สร้างโปรเจกต์ใน Firebase Console แล้วเปิด Anonymous Authentication
2. สร้าง Realtime Database ใน `asia-southeast1` แบบ locked mode
3. นำเนื้อหา [database.rules.json](database.rules.json) ไป Publish ในแท็บ Rules
4. คัดลอก `firebase-config.example.js` เป็น `firebase-config.js` แล้วใส่ Web config ของโปรเจกต์ (ไฟล์นี้ถูก gitignore)

## รันในเครื่อง

```bash
python3 -m http.server 8080
# เปิด http://localhost:8080
```

รัน logic tests (ต้องมี Node 20 ขึ้นไป):

```bash
node --test tests/
```

## Deploy บน Vercel

โปรเจกต์นี้ deploy เป็น static site บน Vercel ได้โดยไม่ต้อง build ไฟล์ `firebase-config.js` จะไม่ถูกส่งขึ้นไป
หน้าเว็บจะดึง config จาก `/api/config` ซึ่งอ่านค่าจาก environment variables แทน

1. Import repo นี้ใน Vercel (หรือ `vercel deploy --prod`)
2. ตั้ง environment variables ใน Vercel: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
3. เพิ่มโดเมน `*.vercel.app` ของโปรเจกต์ใน Firebase Console > Authentication > Settings > Authorized domains
4. Redeploy หนึ่งครั้งหลังตั้งค่า

## วิธีเล่น

คนแรกสร้างห้องและเป็นเจ้ามือ จากนั้นแชร์ลิงก์หรือรหัส 6 ตัวให้เพื่อน ผู้เล่นเดิมพัน แล้วเจ้ามือแจกไพ่ ผู้เล่นเลือกจั่ว/อยู่ภายใน 30 วินาที ก่อนที่เจ้ามือจะตัดสินใจ ระบบคำนวณป๊อก เด้ง ตอง สเตรทฟลัช เรียง เซียน และผลชิปให้เอง

ห้องรองรับ 9 คน ชิปเริ่ม 1,000 และเติมครั้งละ 1,000 เมื่อชิปต่ำกว่าเดิมพันขั้นต่ำ เจ้ามือสามารถตั้ง min/max bet ส่งต่อบทบาท หรือผู้เล่นรับช่วงเมื่อเจ้ามือหายเกิน 60 วินาที

## Deploy

ใช้ Firebase Hosting ได้โดยตรง:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

ความน่าเชื่อถือ: เครื่องเจ้ามือเป็นผู้สับและแจกไพ่ จึงเห็นข้อมูลรอบทั้งหมด เหมาะสำหรับเล่นสนุกกับเพื่อน ไม่ใช่ระบบแข่งขันหรือเงินจริง
