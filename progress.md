Original prompt: 1 เพิ่มความสามารถในการวนผู้เล่น ผู้เล่นจะมีลำดับของตัวเองจะจับเวลาทีละคน วนไปถึงเจ้ามือถ้ามีการเข้า ออก ตำแหน่งต้องปรับตาม เหมือนนั่งล้อมวงเล่นกันจริงๆ 2 จากภาพประกอบ 1-2 ฉันอยากให้จัดการมุมมอง ของคนที่จั่วไพ่ 3 ใบหน่อย จะลดขนาดลงก็ได้ แต่ขอให้ดูดีหน่อย

## 2026-07-16

- Starting implementation: replace the simultaneous player-decision phase with a host-coordinated, clockwise turn queue, then finish at the dealer.
- Plan the layout as a responsive table ring and use a compact overlapping hand only for three-card hands, preserving readability at desktop and mobile sizes.
- Added the turn queue (`turnOrder` / `turnUid`), active-seat treatment, responsive ring layout, and compact three-card hand sizing. The Firebase rules change must be deployed before release so only the current player can submit an action.
- Verified in a real Firebase room with host + 2 players: Turn A stayed → timer and active highlight moved to Turn B → Turn B drew a third card → queue moved to the dealer. Reviewed the three-card desktop screenshot and only existing favicon 404 messages appeared in the console.
