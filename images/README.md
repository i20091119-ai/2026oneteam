# 🎨 우리가 그린 그림 넣는 곳

이 폴더에 **정해진 이름**으로 PNG 그림을 넣으면 게임 그림이 바뀌어요.
그림이 없는 것은 원래 손그림 그대로 나와요. 그래서 **하나씩** 바꿔도 돼요!

📘 그리는 방법과 예시작은 **[그림 그리기 안내서 (PDF)](../docs/drawing-guide.pdf)** 를 보세요.

👉 무엇이 바뀌었는지는 게임의 **Setting ⚙ → 🎨 그림 바꾸기 확인판** (images.html)에서 볼 수 있어요.

## 규칙
- **PNG**로 저장 (배경은 투명하게 하면 예뻐요)
- 파일 이름은 **영어 소문자 그대로** (대문자·띄어쓰기·한글 ❌)
- 친구 그림은 **오른쪽을 보는 모습**으로 (왼쪽은 게임이 뒤집어 줘요)

## 파일 이름

| 무엇 | 파일 이름 | 추천 크기 |
|---|---|---|
| 🟢 세은 | `hero-seeun.png` | 200×300 |
| 🟡 다영 | `hero-dayoung.png` | 200×300 |
| 🔴 태준 | `hero-taejun.png` | 200×300 |
| 시작 화면 배경 | `start-bg.png` | 1920×1080 |
| 시작 화면 제목 글씨 (배경 투명) | `title.png` | 830×480 |
| ▶ PLAY 버튼 / ⚙ SETTINGS 버튼 (배경 투명) | `btn-play.png`, `btn-settings.png` | 570×190 |
| ❤️ 시작 화면 오른쪽 위 하트 (배경 투명) | `start-hearts.png` | 330×90 |
| 🚀 우주선 바닥 | `floor-space.png` | 960×540 |
| ✈️ 비행기 바닥 | `floor-plane.png` | 960×540 |
| 🏫 폐교 바닥 | `floor-school.png` | 960×540 |
| 방마다 바닥 (선택) | `floor-plane-1.png` ~ `floor-plane-3.png`, `floor-school-1.png` ~ `floor-school-3.png` | 960×540 |
| 🚪 출구 문 | `door-exit.png` | 120×180 |
| 🔒 금고 자물쇠 | `lock.png` | 180×200 |
| ✈️ 비행기 창문 (동그란 창) | `window-plane.png` | 120×120 · 유리 자리는 **투명하게** 비워두면 뒤로 구름이 흘러가요 |
| 🏫 교실 창문 (네모난 창) | `window-school.png` | 138×102 · 유리 자리는 **투명하게** |
| 🧑 좌석에 앉은 승객 | `passenger.png` | 120×120 |
| 🪑 가구 (위에서 본 모습) | `furniture-seat.png`, `furniture-desk.png`, `furniture-chair.png`, `furniture-locker.png`, `furniture-cabinet.png`, `furniture-board.png`, `furniture-books.png`, `furniture-plant.png`, `furniture-trash.png`, `furniture-box.png`, `furniture-bag.png`, `furniture-cup.png`, `furniture-cart.png`, `furniture-panel.png`, `furniture-clock.png` | 확인판에 적혀 있어요 |

## 🎭 두 번째 그림 · 스테이지 전용 그림
| 이렇게 이름 붙이면 | 이렇게 쓰여요 |
|---|---|
| `furniture-이름-plane.png` | ✈️ 비행기에서만 (예: `furniture-board-plane.png` = 비행일지) |
| `furniture-이름-school.png` | 🏫 폐교에서만 (예: `furniture-board-school.png` = 칠판) |
| `furniture-이름-2.png` | `stages.js`에서 `look: 2` 라고 적은 가구 (지금: 기장 가방, 복도 화분) |
| `door-exit-plane.png` / `door-exit-school.png` | 스테이지마다 다른 출구 문 |
| `passenger-2.png` ~ `passenger-4.png` | 승객이 여러 모습으로 번갈아 앉아요 |
| `password.png` | 마지막 🔒 비밀번호 창 위에 나오는 그림 |

## 🖌️ 지금 들어 있는 그림 (2026-11-19, 원팀이 Canva로 만든 그림 25장)
- 흰 배경을 지우고(투명), 그림 위 이름 글씨를 빼고, 게임에 맞는 크기로 줄였어요.
- 친구 옷 색은 게임의 문·버튼 색에 맞게 바꿨어요: 세은 멜빵바지 → 🟢연두, 다영 멜빵바지 → 🟡노랑, 태준 티셔츠 → 🔴빨강
- `floor-school.png` (🏫 폐교 나무 바닥)은 2026-11-21에 원팀이 보내 준 나무 바닥 그림으로 바꿨어요. 이어 붙인 자국이 보여서, 자국 없는 한 조각을 잘라 이음매 없이 이어 붙였어요.
- 2026-11-21 원팀 Canva 배경 6장을 넣었어요:
  - 울타리·잔디·구름 그림 → `start-bg.png` (시작 화면 배경). 오른쪽 위 하트는 `start-hearts.png`로 따로 떼어서 화면 오른쪽 위에 붙였어요
    (화면 모양이 달라도 잔디가 늘 보이게 배경은 아래쪽에 맞추고, 하트는 위에 따로 둬요). 하트 뒤에 가려졌던 구름 윗부분은 Claude가 둥글게 이어 그렸어요.
  - 알록달록 '우리 함께 GO!' 글씨 → `title.png` (시작 화면 제목)
  - PLAY · SETTINGS 버튼 → `btn-play.png`, `btn-settings.png` (시작 화면 버튼)
  - 하늘색 빈 배경 → 게임 화면 뒤 바탕색 (#d8eeff)
  - 남색 줄무늬 → `floor-space.png` (🚀 우주선 바닥 — 깜깜한 우주 느낌)
  - 나무 바닥 → `floor-school.png` (🏫 폐교 바닥)
- 원팀 그림이 없던 8장은 원팀 그림 느낌에 맞춰 Claude가 그렸어요 (언제든 우리 그림으로 바꿔도 돼요):
  `floor-plane.png`,
  `furniture-clock.png`, `lock.png`, `door-exit-school.png`, `furniture-board-plane.png`, `furniture-chair-plane.png` (원팀 좌석 그림을 남색으로 칠함)
  (처음엔 `start-bg.png`, `floor-school.png`도 Claude 그림이었는데 원팀 그림으로 바뀌었어요)
- 인터넷에서 가져온 그림이 있다면 어디서 가져왔는지 여기에 적어 두세요: (출처: )

> 바닥 그림 위에 **벽은 게임이 따로 그려요** (부딪히는 곳이라서). 바닥 그림에는 벽을 안 그려도 돼요.
