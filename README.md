# Level Note Editor

Web tool tinh gon de cham note theo MP3 cho music game.

## Cach dung

1. Mo `index.html` bang trinh duyet.
2. Bam `MP3` de chon bai nhac.
3. Bam `Play`, click len timeline de dat note.
4. Chon lane bang nut lane hoac phim `1` den `9`.
5. Doi `Count` de tang/giam so lane. Tool ho tro tu 1 den 12 lane.
6. Right click len note de xoa note gan nhat.
7. Bam `Export JSON` de xuat level.

## JSON format

```json
{
  "version": 1,
  "song": "track.mp3",
  "bpm": 120,
  "lanes": 4,
  "duration": 123.456,
  "notes": [
    { "time": 1.25, "lane": 0, "type": "tap" },
    { "time": 2.5, "lane": 2, "type": "hold", "duration": 0.75 }
  ]
}
```

`time` va `duration` tinh bang giay. `lane` bat dau tu `0`.
