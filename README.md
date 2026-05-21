# Level Note Editor

Web tool tinh gon de cham note theo MP3 cho music game.

## Cach dung

1. Mo `index.html` bang trinh duyet.
2. Bam `MP3` de chon bai nhac.
3. Bam `Play`, click len timeline de dat note.
4. Lane duoc chon theo vi tri click tren timeline.
5. Doi `Lane count` de tang/giam so lane. Tool ho tro tu 1 den 12 lane.
6. Doi `LPB` de quy dinh so line trong moi beat. Tool ho tro tu 1 den 32.
7. Right click len note de xoa note gan nhat.
8. Bam `Export JSON` de xuat level.

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
    { "time": 1.25, "lane": 0, "type": "tap" },
    { "time": 2.5, "lane": 2, "type": "hold", "duration": 0.75 }
  ]
}
```

`time` va `duration` tinh bang giay. `lane` bat dau tu `0`.
