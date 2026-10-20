---
name: explainer-studio
description: "한 줄 주제를 장면표(storyboard.json)로 바꾸고, 같은 장면표를 화이트보드·설계도·수묵화·스위스 타이포 등 8가지 손그림 스타일 중 하나로 그려 자막과 내레이션이 들어간 설명 영상(MP4)으로 만든다. GPU·영상 생성 모델·유료 API 없이 같은 입력이면 같은 영상이 나온다. '설명 영상 만들어줘', '화이트보드 영상', '같은 대본을 8가지 스타일로', 'make an explainer video', 'whiteboard video', 'same script in 8 styles' 요청에 쓴다. Use to turn one topic line into a narrated, captioned explainer video in eight hand-drawn styles, deterministically, with no GPU or video model."
---

# Explainer Studio (explainer-studio)

한 줄 주제를 받아 에이전트가 **장면표(storyboard.json)**를 쓰고, 이 저장소의 엔진이 그 장면표를 한 획씩 그려 MP4로 만듭니다. 장면표는 "무엇을 어디에 언제" 그릴지만 정하고, 스타일은 "어떻게 보이고 움직이는지"만 정하기 때문에 같은 장면표를 8가지 모양으로 다시 렌더할 수 있습니다.

<!-- prereq-adapt -->
## 준비물 (쓰기 전에 있어야 하는 것)
| 준비물 | 어디에 쓰나요 | 꼭 필요한가요 |
|---|---|---|
| Node 20 이상 | 엔진 실행(`npm run es -- ...`) | 필수 |
| FFmpeg와 ffprobe (PATH에 있어야 함) | 프레임을 MP4로 묶고 소리 길이를 잽니다 | 필수 |
| `npm ci` | 의존성 설치(@napi-rs/canvas, roughjs, zod, msedge-tts). 저장소의 `.npmrc`가 설치 스크립트를 끕니다 | 필수 |
| 음성 엔진 하나 | `edge`(인터넷 필요, 비공식 엔드포인트), `sapi`(Windows), `cmd`(내 컴퓨터의 TTS 명령) 중 하나. 없으면 `--tts silent`로 자막만 있는 영상 | 권장 |
| 사실 확인용 자료 | 내레이션에 넣을 수치·주장의 출처 | 설명 영상이면 필수 |

## 바꿔 쓰기: 이렇게 말하세요
| 이렇게 말하면 | 바뀌는 것 |
|---|---|
| "설계도 느낌으로 바꿔 줘" | `npm run es -- set-style <slug> blueprint` 또는 `render <slug> --style blueprint` |
| "8가지 스타일로 다 비교해 보여 줘" | `npm run es -- styleframes <slug> --styles all --scenes 1,4,6` (스타일별 장면 이미지와 비교표) |
| "영어 남자 목소리로" / "한국어 여자 목소리로" | `WV_EDGE_VOICE=en-US-AndrewNeural` / `ko-KR-SunHiNeural` (지정하지 않으면 문장 언어로 자동 선택) |
| "말을 조금 빠르게" | `WV_EDGE_RATE=+10%` |
| "내 컴퓨터의 TTS를 써 줘" | `WV_TTS_CMD='piper --model m.onnx --output_file {out} --text {text}'` 후 `--tts cmd` |
| "목소리 없이 자막만" | `build <slug> --tts silent` |
| "앞 5초만 먼저 보여 줘" | `render <slug> --clip 0:5` |
| "자막을 크게" | 장면표 최상위에 `"subtitleSize": 48` |
| "이 장면만 첩보영화 오프닝처럼" | 그 장면에 `"style": "spy-titles"` (메인 스타일 렌더에서만 적용) |
| "세로 쇼츠도 필요해" | 지금은 1920x1080 가로만 지원합니다. 세로판은 별도 작업입니다 |

새 스타일을 만들거나 그리는 방식을 바꾸려면 `src/render/styles/<id>.ts`와 `styles/<id>/STYLE.md`를 함께 고칩니다.

## 절차
1. **주제를 한 줄로 확정하고 사실을 조사합니다.** 수치와 주장은 출처를 `research/sources.json`에 적습니다. 확인하지 못한 내용은 내레이션에 넣지 않습니다.
2. **장면표를 씁니다.** `npm run es -- init "How does X work?" --slug my-topic --style whiteboard`로 틀을 만들고 `output/my-topic/storyboard.json`을 채웁니다.
   - 장면 6~8개, 장면마다 내레이션 2~3문장, 문장은 짧게 씁니다.
   - **첫 장면은 결과부터** 보여 줍니다("이 유리 실이 바다를 건넜습니다"). 질문과 배경은 그다음입니다.
   - 좌표는 1920x1080 기준입니다. 요소는 y 140~930 안에 두고(아래는 자막 자리), 오른쪽 위 320x130은 비워 둡니다. 글자는 28px 이상, 장면당 요소는 12개 이하입니다.
   - 요소 종류: `text`(role: title/heading/body/label/caption), `rectangle`, `circle`(label 가능), `line`(points), `arrow`(from/to/bend/label), `icon`(chat, robot, gear, tool, search, database, loop, check, warning, document, globe, lightbulb, lock, clock, folder, scale, door, bell, slides), `chart`(bar), `highlight`(target, style: underline/circle/marker), `image`, `sticker`.
   - 색은 이름으로만 씁니다: black, yellow, blue, green, red, grey, white. 스타일이 각자의 색으로 바꿔 그립니다.
   - `drawOrder`에 모든 요소 id를 그리는 순서대로 넣습니다. `cue`(문장 번호)를 주면 그 문장에서 그려집니다.
   - 예시는 `examples/fiber-optics/storyboard.json`(영어 7장면, 수치 출처는 같은 폴더의 `research/sources.json`)과 `examples/ai-agent-vs-chatbot-ko/storyboard.json`(한국어 5장면)에 있습니다. 숫자가 들어가는 장면은 출처를 `research/sources.json`에 함께 적고, 확인하지 않은 수치는 차트에 넣지 않습니다.
3. **스타일을 고릅니다.**

   | 메시지 | 스타일 |
   |---|---|
   | 한 문장으로 끝나는 메시지, 원칙 | `swiss-motion` |
   | 구조·흐름·작동 원리 | `blueprint`, `whiteboard` |
   | AI·코드·자동화 | `ascii-crt` |
   | 태도·성찰·경험담 | `ink-wash`, `urban-sketch` |
   | 이야기·반전·유래 | `shadow-puppet`, `spy-titles` |

   고르기 어려우면 `styleframes --styles all`로 같은 장면을 8가지로 뽑아 비교합니다.
4. **만들고 확인합니다.**
   ```bash
   npm run es -- build my-topic --tts edge      # 음성 → 시간 맞추기 → 검사 → 렌더
   npm run es -- render my-topic --style ink-wash   # 같은 장면표를 다른 스타일로(variants/ 아래)
   ```
   검사는 화면 밖 요소, 자막 자리 침범, 작은 글자, 겹침, 글자 넘침, 10초 이상 멈춘 화면을 찾아 고치고, 남은 오류가 있으면 렌더를 거부합니다.
5. **공유 전에 직접 봅니다.** `preview/`의 장면 이미지와 `frames/`의 중간·전환 프레임을 열어 글자 잘림과 겹침을 확인하고, 완성 MP4를 처음부터 끝까지 재생해 소리와 자막을 듣고 봅니다. 검사 통과는 시청 확인을 대신하지 못합니다.

## 한계
- 1920x1080 가로 영상만 만듭니다. 세로 쇼츠와 실사 영상은 다른 도구가 필요합니다.
- 캐릭터 애니메이션, 3D, 실제 화면 녹화 재현 같은 스타일은 지원하지 않습니다. 그리는 요소는 위 목록뿐입니다.
- 자막 시간은 문장 길이 비율로 나누며 음성과 단어 단위로 맞추지 않습니다.
- `edge` 음성은 Microsoft Edge의 비공식 엔드포인트를 씁니다. 2026-10-20 확인 때는 HTTP 403으로 막혀 있었으므로, 실패하면 `sapi`(Windows)나 `cmd`로 바꿉니다. 수익 목적으로 공개하기 전에 이용 조건을 확인하거나 공식 음성 서비스나 `cmd`로 바꿉니다.
- `--tts silent`의 장면 길이는 글자 수로 추정한 값입니다.
- 남의 목소리를 허락 없이 복제해 `cmd`에 연결하지 않습니다.

<!-- credits -->
## 출처와 영감
- **스타일 목록과 시각 언어**: [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)(코드 MIT, 문서 CC BY 4.0)의 스타일 구성(감독 문서, 기술 문서, 스타일별 STYLE.md)과 각 스타일의 시각 언어를 참고했습니다. 문서와 코드는 이 프로젝트의 요소 기반 엔진에 맞게 새로 썼습니다.
- **손그림 선**: [Rough.js](https://github.com/rough-stuff/rough)(MIT)
- **그리기**: [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)(MIT)
- **영상 묶기**: [FFmpeg](https://ffmpeg.org/)(LGPL/GPL, 따로 설치)
- **음성**: [msedge-tts](https://github.com/Migushthe2nd/MsEdgeTTS)(MIT, 비공식 Edge 엔드포인트)
- **글꼴**: Gaegu, Nanum Gothic·Myeongjo·Pen Script·Gothic Coding, IBM Plex Sans KR, Black Han Sans. 모두 SIL Open Font License 1.1이며 라이선스 파일이 `assets/fonts/`에 함께 있습니다.
