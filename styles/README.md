# 스타일 목록

같은 `storyboard.json`을 여러 스타일로 렌더링할 수 있습니다. 스토리보드는 **무엇을 어디에 언제** 그릴지만 정하고, 스타일은 **어떻게 보이고 움직이는지**를 정합니다.

| id | 이름 | 한 줄 요약 | 어울리는 주제 |
|---|---|---|---|
| [`whiteboard`](whiteboard/STYLE.md) | 화이트보드 | 흰 보드에 검은 마커로 한 획씩 그리는 Excalidraw 풍 | 개념 설명, 강의, 비교 |
| [`swiss-motion`](swiss-motion/STYLE.md) | 스위스 모션 타이포 | 12단 그리드, 검정 블록, 빨강 하나, 스냅 모션 | 메시지·원칙 정리, 스레드 글 영상화, 브랜드 선언 |
| [`blueprint`](blueprint/STYLE.md) | 블루프린트 설계도 | 청사진 위 흰 제도선, 해칭, 타이핑 주석 | 시스템 구조, 아키텍처, 작동 원리 |
| [`ink-wash`](ink-wash/STYLE.md) | 수묵화 | 화선지, 굵기가 변하는 붓선, 번지는 먹, 붉은 낙관 | 철학·태도·인사이트, 성찰형 메시지 |
| [`urban-sketch`](urban-sketch/STYLE.md) | 펜 담채 스케치 | 세피아 펜선 위로 선을 벗어나 번지는 수채 | 경험담, 일상, 따뜻한 에세이형 설명 |
| [`spy-titles`](spy-titles/STYLE.md) | 60년대 첩보영화 오프닝 | 4색 컷페이퍼, 장면마다 바뀌는 바탕, 치고 들어오는 조각 | 반전·미스터리형 도입, 대결 구도, 예고편 |
| [`shadow-puppet`](shadow-puppet/STYLE.md) | 그림자극 | 등잔불 스크린, 빛이 비치는 가죽 인형, 떨리는 손 | 이야기·우화, 유래와 역사, 따뜻한 스토리텔링 |
| [`ascii-crt`](ascii-crt/STYLE.md) | ASCII 터미널 | 호박색 CRT, 모든 선이 문자 격자, 커서 타이핑 | AI·개발·자동화, 로그·프로세스 설명 |

## 고르는 법

1. **메시지가 한 문장으로 끝나는가** → `swiss-motion`
2. **구조·흐름·부품을 보여줘야 하는가** → `blueprint` 또는 `whiteboard`
3. **AI·코드·자동화 이야기인가** → `ascii-crt`
4. **감정이나 태도, 인사이트가 중심인가** → `ink-wash` 또는 `urban-sketch`
5. **이야기(주인공·전환)가 있는가** → `shadow-puppet` 또는 `spy-titles`

결정이 어렵다면 `npm run es -- styleframes <slug> --styles all`로 같은 장면을 모든 스타일로 뽑아 비교하세요.

## 명령

```powershell
npm run es -- styles                                    # 목록
npm run es -- init "주제" --slug my-topic --style ink-wash
npm run es -- set-style my-topic blueprint              # 메인 스타일 변경
npm run es -- styleframes my-topic --styles all --scenes 1,4,6
npm run es -- render my-topic --style swiss-motion      # variants/swiss-motion/ 에 추가 버전
npm run es -- render my-topic --style ascii-crt --clip 12:17   # 전환 구간 5초 시험 렌더
```

## 아직 지원하지 않는 스타일

Lemo-Opuscar의 39개 스타일 중 캐릭터 리그·3D·UI 재현이 필요한 스타일(`hd-2d`, `paper-popup`, `scifi-toon`, `living-screencast`, `pictogram-motion`, `pixel-rpg` 등)은 이 설명 영상 엔진의 요소 타입(text, rectangle, circle, line, arrow, icon, chart, highlight, sticker)으로 표현하기 어렵습니다. 별도 엔진이 필요합니다.

## 출처

스타일 구성(감독 문서 + 기술 문서 + 스타일별 STYLE.md)과 각 스타일의 시각 언어는 [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)(코드 MIT, 문서 CC BY 4.0)를 참고했습니다. 문서와 코드는 이 프로젝트의 요소 기반 엔진에 맞게 새로 작성했습니다.
