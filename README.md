# Education Green - เว็บไซต์บริษัท

เว็บไซต์สำหรับบริษัท Education Green Public Company Limited สร้างขึ้นด้วย HTML, CSS, และ JavaScript (Vanilla JS) โดยเน้นการออกแบบที่ทันสมัย, ตอบสนองต่อทุกขนาดหน้าจอ (Responsive), และมอบประสบการณ์การใช้งานที่ดีเยี่ยม

![Screenshot of the Education Green website](./screenshot.png)

> **Note:** หากต้องการดูเว็บไซต์จริง, ให้เปิดไฟล์ `index.html` ในเบราว์เซอร์

---

## ✨ คุณสมบัติเด่น (Features)

### 🖥️ ประสบการณ์บนเดสก์ท็อป (Desktop Experience)
-   **Sticky & Shrinking Header:** แถบเมนูด้านบนจะยึดติดและลดขนาดลงเมื่อเลื่อนหน้าจอ เพื่อไม่ให้บดบังเนื้อหา
-   **Course Carousel:** ส่วน "Featured Courses" เป็น Carousel แนวนอนที่สามารถเลื่อนได้ด้วยปุ่มลูกศรและคีย์บอร์ด (ซ้าย/ขวา)
-   **Smooth Scrolling:** การคลิกลิงก์เมนูจะเลื่อนไปยังส่วนต่างๆ ของหน้าเว็บอย่างนุ่มนวล
-   **Hover Effects:** มีเอฟเฟกต์สวยงามเมื่อนำเมาส์ไปวางบนเมนู, ปุ่ม, และการ์ดต่างๆ

### 📱 ประสบการณ์บนมือถือ (Mobile Experience)
-   **Single-Page App (SPA) Style Navigation:** ใช้แถบเมนูด้านล่างที่เหมือนแอปพลิเคชัน ทำให้สลับหน้าได้อย่างรวดเร็วโดยไม่ต้องโหลดหน้าใหม่
-   **Swipeable Carousel:** Carousel ในส่วน "Featured Courses" สามารถเลื่อนได้ด้วยการปัด (Swipe)
-   **Optimized Layout:** จัดวางเนื้อหาให้เหมาะสมกับหน้าจอขนาดเล็ก อ่านง่าย และใช้งานสะดวก

### 🎨 การออกแบบและประสบการณ์ผู้ใช้ (Design & UX)
-   **Modern "Eco-Teal" Theme:** ดีไซน์สะอาดตาและเป็นมืออาชีพด้วยโทนสีเขียว-ทีล
-   **Reveal-on-Scroll Animations:** เนื้อหาจะค่อยๆ ปรากฏขึ้นอย่างสวยงามเมื่อผู้ใช้เลื่อนหน้าจอ
-   **Floating Form Labels:** ในฟอร์มติดต่อ, Label จะลอยขึ้นเมื่อผู้ใช้เริ่มพิมพ์ข้อความ
-   **Accessibility (A11y):** ใส่ใจในการเข้าถึงเว็บไซต์ เช่น การใช้ ARIA attributes, การรองรับการนำทางด้วยคีย์บอร์ด, และการจัดการ `focus`

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

-   **HTML5:** สำหรับโครงสร้างของเว็บไซต์
-   **CSS3:**
    -   ใช้ CSS Variables สำหรับการจัดการ Theme สี
    -   Flexbox และ Grid สำหรับการจัด Layout
    -   Animations และ Transitions
    -   Responsive Design ด้วย Media Queries
-   **Vanilla JavaScript (ES6+):**
    -   จัดการ DOM และ Event Listeners
    -   สร้าง Logic สำหรับ SPA-style navigation บนมือถือ
    -   ควบคุมการทำงานของ Carousel
    -   ใช้ Intersection Observer API สำหรับ "Reveal on scroll"
-   **Font Awesome:** สำหรับไอคอนต่างๆ

---

## 🚀 การติดตั้งและใช้งาน (Setup & Usage)

โปรเจกต์นี้เป็นเว็บไซต์แบบ Static ไม่จำเป็นต้องมีขั้นตอนการ build ที่ซับซ้อน

1.  Clone repository นี้ลงในเครื่องของคุณ:
    ```bash
    git clone https://github.com/yutinfo/web-green-company.git
    ```
2.  เข้าไปในโฟลเดอร์โปรเจกต์:
    ```bash
    cd web-green-company
    ```
3.  เปิดไฟล์ `index.html` ด้วยเว็บเบราว์เซอร์ที่คุณต้องการ (เช่น Google Chrome, Firefox)

---

## 📂 โครงสร้างไฟล์ (File Structure)

```
web-green-company/
├── 📁 fonts/             # ไฟล์ฟอนต์ Sarabun ที่ใช้ในโปรเจกต์
├── 📄 index.html         # ไฟล์หลักของหน้าเว็บ
├── 📄 style.css          # ไฟล์ CSS สำหรับสไตล์ทั้งหมด
├── 📄 script.js          # ไฟล์ JavaScript สำหรับควบคุมการทำงานต่างๆ
└── 📄 README.md          # ไฟล์ที่คุณกำลังอ่านอยู่
```

---

## 📄 License

This project is licensed under the MIT License.