# Level Note Editor

Web tool tinh gon de cham note theo MP3 cho music game.

## Cach dung

1. Mo `index.html` bang trinh duyet.
2. Bam `MP3` de chon bai nhac.
3. Bam `Play`, click len timeline de dat note.
4. Lane duoc chon theo vi tri click tren timeline.
5. Doi `Lane count` de tang/giam so lane. Tool ho tro tu 1 den 12 lane.
6. Doi `LPB` de quy dinh so line trong moi beat. Tool ho tro tu 1 den 32.
7. Click len note de select, hoac drag tren timeline de select nhieu note.
8. Chon type `Hold`, click diem dau va click diem duoi cung lane, time duoi phai lon hon time dau.
9. Chon type `Curve`, click nhieu diem tren cac lane de tao path; right click de ket thuc curve.
10. Them/xoa meta trong Inspector; meta duoc gan vao tat ca note dang select.
11. Right click timeline de mo menu Copy/Paste/Delete. Copy va Delete can note dang select; Paste can copy truoc do.
12. Bam `Export JSON` de xuat level.

## JSON format

```json
{
  "version": 1,
  "song": "track.mp3",
  "bpm": 120,
  "lpb": 4,
  "lanes": 4,
  "duration": 123.456,
  "notes": [
    { "time": 1.25, "lane": 0, "type": "tap", "meta": [{ "key": "spawn", "value": "left" }] },
    { "time": 2.5, "lane": 2, "type": "hold", "duration": 0.75, "meta": [] },
    { "time": 4.0, "lane": 1, "type": "curve", "points": [{ "time": 4.0, "lane": 0 }, { "time": 4.5, "lane": 1 }], "meta": [] }
  ]
}
```

`time` va `duration` tinh bang giay. `lane` bat dau tu `0`.
