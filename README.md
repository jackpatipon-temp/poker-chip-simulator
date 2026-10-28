# ♠️ Poker Texas Hold'em Chip Simulator

> **A real-time minimal dark mode chip & pot management web application for in-person Texas Hold'em games played with physical cards.**  
> เว็บแอปพลิเคชันจำลองการลงเดิมพัน จัดการชิป และเงินกองกลาง (Pot) สำหรับเกม Texas Hold'em โดยใช้ไพ่จริงนอกจอ รองรับการเล่นออนไลน์แบบ Real-time หลายอุปกรณ์

---

## 📌 Project Overview & Purpose (ภาพรวมและวัตถุประสงค์)

โปรเจกต์นี้พัฒนาขึ้นเพื่อแก้ไขปัญหาเมื่อเล่นการ์ดเกมหรือโป๊กเกอร์กับกลุ่มเพื่อน/ครอบครัวด้วยสำรับไพ่จริงนอกจอ แต่ไม่มีชิปจริง หรือต้องการความสะดวก รวดเร็ว และความโปร่งใสในการคำนวณเงินกองกลาง (Pots, Side-pots, Blinds, Minimum Raise) 

### ✨ Key Features
- 🌙 **Minimal Dark Mode UI**: ดีไซน์เรียบหรู ทันสมัย รองรับหน้าจอมือถือเป็นหลัก พร้อมปุ่ม Fullscreen Mode
- 💡 **Interactive Action Tips**: ปุ่ม Floating Tip อธิบายกติกาเบื้องหลังการ Bet, Call, Raise และการเปลี่ยน Turn แบบ Interactive
- 👥 **Multiplayer Real-time Sync**: รองรับผู้เล่น 2-10 คน ซิงค์สถานะชิปและตาเดินแบบ Realtime ผ่าน Supabase
- 🔒 **Google OAuth Authentication**: แสดงภาพโปรไฟล์และชื่อจริงตามบัญชี Google ของผู้เล่น
- 👑 **Host / Admin Controls**: เจ้าของห้องสามารถอนุมัติผู้เข้าเล่น, กำหนดชิปเริ่มต้น, ทำการ Undo การตัดสินใจที่ผิดพลาด และเปิดระบบโหวต (Vote) ให้ทุกคนมีส่วนร่วม
- ☕ **Sit Out & AFK Mode**: ระบบขอพักชั่วคราว พร้อมปุ่มสถานะแจ้งเตือนผู้เล่นคนอื่นในโต๊ะ

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Vanilla CSS / Responsive Dark System
- **Realtime & Backend**: Supabase (PostgreSQL & Realtime Broadcast Channels)
- **Authentication**: Supabase Auth (Google OAuth)
- **Deployment**: Vercel

---

## ⚖️ Legal Disclaimer (ข้อสงวนสิทธิ์ทางกฎหมาย)

> [!IMPORTANT]
> **คำเตือนและการปฏิเสธความรับผิดชอบ:**
> 
> เว็บไซต์และซอร์สโค้ดนี้ **จัดทำขึ้นเพื่อการศึกษาทางวิศวกรรมซอฟต์แวร์ และเพื่อความบันเทิง/การแข่งขันกีฬาเชิงกลยุทธ์เท่านั้น**  
> - ระบบนี้ **ไม่มี** ฟังก์ชันการฝาก-ถอนเงินจริง และ **ไม่สนับสนุนการเล่นการพนันที่มีการลงเดิมพันด้วยเงินสดหรือทรัพย์สินมีค่าใดๆ ทั้งสิ้น**
> - ผู้พัฒนาไม่มีส่วนเกี่ยวข้องและไม่รับผิดชอบต่อการนำโปรแกรมนี้ไปใช้งานในลักษณะที่ขัดต่อกฎหมาย พ.ร.บ. การพนัน หรือกฎหมายท้องถิ่นของแต่ละพื้นที่

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jackpatipon/poker-chip-simulator.git
cd poker-chip-simulator
npm install
```

### 2. Configure Environment Variables
สร้างไฟล์ `.env.local` จาก `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```
เปิดบราวเซอร์ที่ [http://localhost:3000](http://localhost:3000)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE) by Patipon (@jackpatipon).
