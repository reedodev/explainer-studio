<p align="center"><img src="docs/eight-styles.gif" alt="같은 장면표를 손그림 8가지 스타일로 나란히 렌더한 모습" width="100%"></p>

<p align="center">
<a href="https://github.com/reedodev/explainer-studio/actions/workflows/test.yml"><img src="https://github.com/reedodev/explainer-studio/actions/workflows/test.yml/badge.svg" alt="test"></a>
<img src="https://img.shields.io/badge/Claude_Code-skill-2547F4" alt="Claude Code skill">
<img src="https://img.shields.io/badge/GPU-not_needed-black" alt="No GPU">
<img src="https://img.shields.io/badge/license-MIT-black" alt="MIT">
</p>

[English](README.md) | **한국어**

# 설명 영상 만들기 (Explainer Studio)

**한 줄 주제를 넣으면 내레이션과 자막이 들어간 설명 영상이 8가지 손그림 스타일로 나옵니다.**

"광케이블은 어떻게 빛을 전달할까?" 같은 주제를 코딩 에이전트에게 말하면 에이전트가 장면표를 쓰고, 이 엔진이 그 장면표를 화이트보드 스케치, 설계도, 수묵화, 60년대 첩보영화 오프닝 같은 스타일로 한 획씩 그려 내레이션과 자막이 든 MP4로 만듭니다. 위 데모는 장면표 파일 하나를 8번 렌더한 결과이고(음성 없음, 자막은 영상에 입혀 둠), 모든 숫자에는 출처가 있습니다(`examples/fiber-optics/research/sources.json`). 스타일 하나로 끝까지 렌더한 영상은 [`docs/fiber-optics-blueprint.mp4`](docs/fiber-optics-blueprint.mp4)에, 제작자 본인 목소리로 만든 한국어 예시는 [`docs/ai-agent-vs-chatbot-ko-voice.mp4`](docs/ai-agent-vs-chatbot-ko-voice.mp4)에 있습니다. 이 한국어 예시는 제작자 본인 목소리로 만든 것이며 제작자의 컴퓨터에서 로컬 음성 모델로 합성했습니다. 다른 음성 합성 프로그램은 `--tts cmd`로 연결할 수 있습니다.

## 처음 쓰시는 분을 위한 안내

### 이런 문제를 풀고, 이럴 때 씁니다

"광케이블은 어떻게 빛을 전달할까?" 같은 주제로 내레이션과 자막이 들어간 짧은 설명 영상을 만들고 싶은데, 영상 편집 프로그램을 배우거나 GPU를 빌리거나 영상 생성 API에 돈을 내고 싶지는 않을 때 씁니다. 주제를 코딩 에이전트에게 말하면 에이전트가 장면표 파일을 쓰고, 이 엔진이 그 장면표를 프레임 단위로 그려 MP4와 `.srt` 자막 파일로 만들어 줍니다.

적합한 경우는 45~60초짜리 개념 설명, 수업용 클립, 두 가지 개념의 비교입니다. 화면 녹화, 3D 장면, 걸어 다니는 캐릭터에는 맞지 않습니다([한계](#한계) 참고).

### 낯선 말 풀이

| 말 | 뜻 |
|---|---|
| Claude Code | 터미널에서 AI에게 일을 시키는 Anthropic의 프로그램입니다. 이 스킬은 그 안에서 씁니다. |
| 스킬 | AI에게 "이런 일은 이 순서로 하라"고 알려 주는 설명서 폴더입니다. 설치하면 평소 말투로 부탁할 수 있습니다. |
| 터미널 | 글자로 명령을 입력하는 창입니다. Windows는 PowerShell, Mac은 터미널 앱입니다. |
| Node.js | 이 프로젝트의 코드를 실행하는 프로그램입니다. `npm`이 함께 설치됩니다. |
| FFmpeg | 그림과 소리를 묶어 MP4로 만들어 주는 무료 도구입니다. 이 프로젝트에 꼭 필요합니다. |
| 장면표(storyboard) | `storyboard.json` 파일입니다. 장면마다 화면에 무엇이 어디에 언제 나오는지와 읽을 내레이션이 들어 있습니다. |
| TTS | 글을 음성으로 바꾸는 기능입니다. `--tts silent`는 음성 없이 만들어서 음성 설정 없이도 전부 시험해 볼 수 있게 합니다. |
| SRT | 글자만 든 자막 파일입니다. 영상을 만들 때마다 하나씩 같이 나옵니다. |

### 준비 확인

터미널에 아래를 입력해 각각 버전이 나오는지 확인합니다.

```bash
node -v
npm -v
ffmpeg -version
```

- `node -v`가 `v20` 이상이어야 합니다(이 안내는 v26.5.0에서 확인했고, 이 프로젝트의 자동 시험은 Node 22를 씁니다). 설치는 Windows는 `winget install OpenJS.NodeJS.LTS`, Mac은 `brew install node`입니다. 설치한 뒤에는 터미널을 닫았다가 다시 엽니다.
- `ffmpeg -version`에 버전 줄이 나와야 합니다. 설치는 Windows는 `winget install Gyan.FFmpeg`, Mac은 `brew install ffmpeg`입니다. 설치한 뒤에는 터미널을 다시 엽니다. 설치했는데도 찾지 못하면 `FFMPEG_PATH`와 `FFPROBE_PATH`에 두 프로그램의 전체 경로를 지정합니다.
- Claude Code는 "평소 말투로 부탁하는" 방법에만 필요합니다. [공식 안내](https://code.claude.com/docs/en/overview)에 따라 설치합니다. 아래 명령은 Claude Code 없이도 실행됩니다.

### 따라 하기 3단계

**1단계. 설치합니다.** Claude Code 안에서 아래 두 줄을 입력합니다.

```
/plugin marketplace add reedodev/explainer-studio
/plugin install explainer-studio@explainer-studio
```

명령을 직접 실행해 보려면 저장소를 받고 패키지를 한 번 설치합니다(이 안내를 만든 컴퓨터에서 내려받기 약 15초, 설치 약 4초였습니다).

```bash
git clone https://github.com/reedodev/explainer-studio
cd explainer-studio
npm ci
```

**2단계. 에이전트에게 말합니다.** 아래 문장을 하나씩 복사해서 Claude Code에 붙여 넣습니다.

1. `explainer-studio로 "백신이 면역을 훈련시키는 방법" 설명 영상을 청사진(blueprint) 스타일로 만들어 줘. 음성은 일단 없이.`
2. `같은 장면표를 먹그림(ink-wash) 스타일로도 만들어서 두 가지를 비교해 줘.`
3. `final.mp4와 subtitles.srt가 어디 있는지 알려 주고, validation-report.md에 경고가 있으면 고쳐 줘.`

직접 해 보려면 들어 있는 예시 하나를 실행합니다.

```bash
npm run es -- build examples/fiber-optics --tts silent --style blueprint
```

**3단계. 결과를 확인합니다.** `examples/fiber-optics/variants/blueprint/final.mp4`를 엽니다. 같은 폴더의 `contact-sheet.png`(장면마다 한 컷)와 `validation-report.md`(검사에서 찾은 내용)도 봅니다.

### 실제로 실행한 출력

새로 받은 저장소에서 위 명령을 그대로 실행해 얻은 출력입니다(Windows, Node v26.5.0, FFmpeg 8.0.1). 앞부분과 긴 겹침 목록은 줄였고 경로 앞부분은 `...`로 바꿨습니다. 43초 걸렸고 종료 코드는 0이었습니다.

```
Note: --tts silent writes no voice. Scene lengths are estimated from the text.
scene-01 6.738 silent
scene-02 7.123 silent
...
scene-07 7.892 silent
rendered blueprint scene-01 202
...
rendered blueprint scene-07 1600
contact sheet (one frame at 70% per scene): ...\examples\fiber-optics\variants\blueprint\contact-sheet.png
blueprint done: 53.3 s video in 42 s -> ...\examples\fiber-optics\variants\blueprint\final.mp4
0 error(s), 1 warning(s), 14 intended overlap(s) not listed as warnings
  text fit checked in all 8 styles
  warn  scene-04: sparse scene (elements cover 33% of the safe area (aim for 35%+): ...)
```

읽는 법: `scene-NN` 줄은 장면별 길이(초)이고, `rendered` 줄은 장면마다 그린 프레임 수입니다. 마지막 줄들이 검사 결과입니다. **오류(error)가 있으면 렌더가 멈추고, 경고(warning)는 멈추지 않습니다.** 위 경고는 4번 장면이 조금 비어 있다는 뜻입니다. 영상은 1920x1080, 초당 30프레임, H.264 영상과 AAC 소리이며 길이는 53.3초입니다(ffprobe로 확인). 자막 파일 `subtitles.srt`는 프로젝트 폴더인 `examples/fiber-optics/`에 만들어집니다.

처음 보면 놀라는 점이 두 가지 있습니다. `build`가 측정한 장면 길이를 `examples/fiber-optics/storyboard.json`에 다시 적기 때문에 `git status`에 그 파일이 수정됨으로 나옵니다(정상입니다). 그리고 아래의 다른 렌더 명령은 `build`를 한 번 실행해 그 값이 적힌 뒤에만 동작합니다.

같은 폴더에서 이어서 해 볼 수 있는 명령입니다(같은 컴퓨터에서 잰 시간입니다).

```bash
npm run es -- render examples/fiber-optics --style ink-wash        # 약 30초 -> variants/ink-wash/final.mp4
npm run es -- styleframes examples/fiber-optics --styles all       # 약 7초  -> styleframes/contact-sheet.png
npm run es -- build examples/ai-agent-vs-chatbot-ko --tts silent   # 약 12초 -> examples/ai-agent-vs-chatbot-ko/final.mp4
```

### 막힐 때

아래 줄은 모두 새로 받은 저장소에서 직접 재현한 것입니다. 오류 문구는 프로그램이 출력하는 영어 그대로 적었습니다.

| 증상 | 원인 | 해결 |
|---|---|---|
| `Error: ffmpeg was not found. Install FFmpeg (...)`가 나오고 종료 코드 1 | FFmpeg가 설치되지 않았거나 PATH에 없습니다 | 위 "준비 확인"대로 설치하고 터미널을 다시 연 뒤 `ffmpeg -version`을 확인합니다. 또는 `FFMPEG_PATH` / `FFPROBE_PATH`를 지정합니다 |
| `Error: no project found (missing ...\output\nope\storyboard.json)` | `build` / `render` 뒤의 폴더 이름이나 경로가 틀렸습니다 | `examples/fiber-optics`처럼 있는 폴더를 쓰거나 `npm run es -- init "Why do cats purr?" --slug cats`로 새로 만듭니다 |
| `Validation failed for style ink-wash; render refused.` 뒤에 `ERROR scene-01 / title: invalid animation window`가 여러 줄 나옵니다 | `build`나 `tts`를 하기 전에 `render`를 실행해서 장면표에 측정된 장면 길이가 아직 없습니다(`git checkout`으로 예시의 `storyboard.json`을 되돌린 뒤에도 같습니다) | 먼저 `npm run es -- build <폴더> --tts silent`를 실행한 다음 `render`를 실행합니다 |
| `git status`에 `examples/fiber-optics/storyboard.json`이 수정됨으로 나옵니다 | `build`가 측정한 장면 길이를 그 파일에 적습니다 | 정상입니다. 그대로 두십시오. `git checkout`으로 되돌렸다면 `render` 전에 `build`를 다시 실행합니다 |
| `warn  scene-04: sparse scene (...)` | 그 장면이 안전 영역의 35%보다 적게 차 있습니다 | 오류가 아닙니다. 없애려면 도형을 더하거나 키웁니다. 영상은 그대로 만들어집니다 |

---

## 빠른 시작

```bash
git clone https://github.com/reedodev/explainer-studio && cd explainer-studio
npm ci                                   # Node 20 이상과, PATH에 FFmpeg가 필요합니다
npm run es -- build examples/fiber-optics --tts silent --style blueprint
```

영상은 `examples/fiber-optics/variants/blueprint/final.mp4`에 자막이 입혀진 채로 만들어집니다(장면표에 적힌 `style`로 렌더하면 프로젝트 폴더의 `final.mp4`에, 다른 스타일은 `variants/<스타일>/final.mp4`에 만들어집니다). 음성을 넣으려면 `--tts silent` 대신 `sapi`(Windows, 인터넷 불필요), `cmd`(내 컴퓨터의 아무 TTS), `edge`(인터넷 필요, 비공식 엔드포인트라서 2026-10-20에 마지막으로 확인했을 때 HTTP 403이 나왔습니다)를 씁니다. 같은 파일을 다른 모습으로도 만들어 봅니다.

```bash
npm run es -- render examples/fiber-optics --style ink-wash        # -> variants/ink-wash/final.mp4
npm run es -- styleframes examples/fiber-optics --styles all       # 8가지 스타일을 한 장에 모은 비교 이미지
npm run es -- build examples/ai-agent-vs-chatbot-ko --tts silent  # 한국어 예시(5장면)
npm run es -- init "Why do cats purr?" --slug cats                 # output/cats에 3장면짜리 시작 틀을 만들고 다음 명령을 알려 줍니다
```

Claude Code를 쓴다면 스킬을 설치하고 평소 말투로 부탁하면 됩니다. 예: "백신이 면역을 훈련시키는 방법을 청사진 스타일로 설명 영상 만들어 줘".

```
/plugin marketplace add reedodev/explainer-studio
/plugin install explainer-studio@explainer-studio
```

## 두 번째 예시: 배치 레시피만 보고 쓴 장면표

<p align="center"><img src="docs/sky-blue-two-styles.gif" alt="하늘은 왜 파란가를 수묵화와 화이트보드 스타일로 렌더한 모습" width="100%"></p>

`examples/sky-blue`(6장면, 45초, 모든 숫자의 출처가 `research/sources.json`에 있음)는 [장면표 레시피](skills/explainer-studio/reference/storyboard-recipes.md)만 보고 쓴 장면표입니다. 결과 먼저 보여 주는 도입, 스펙트럼, 말풍선이 달린 차트, A와 B 비교, 노을 경로, 요약 순서입니다. 요소는 모두 장면의 65% 지점까지 그려지기 때문에 장면 대부분의 시간 동안 완성된 그림이 보입니다.

## 8가지 스타일, 장면표는 하나

| 스타일 | 모습 | 어울리는 주제 |
|---|---|---|
| <img src="docs/styles/whiteboard.jpg" width="220"><br>`whiteboard` | 흰 보드에 검은 마커를 한 획씩 그립니다 | 개념, 수업, 비교 |
| <img src="docs/styles/swiss-motion.jpg" width="220"><br>`swiss-motion` | 12단 격자, 검은 블록, 빨간색 하나, 경쾌한 움직임 | 한 문장 메시지, 원칙 |
| <img src="docs/styles/blueprint.jpg" width="220"><br>`blueprint` | 청사진 파란 종이 위 흰 제도선, 타자처럼 찍히는 주석 | 작동 원리, 시스템, 구조 |
| <img src="docs/styles/ink-wash.jpg" width="220"><br>`ink-wash` | 굵기가 변하는 붓선, 번지는 먹, 붉은 낙관 | 성찰, 태도, 통찰 |
| <img src="docs/styles/urban-sketch.jpg" width="220"><br>`urban-sketch` | 세피아 펜선과 선 밖으로 번지는 수채 | 경험담, 일상 주제 |
| <img src="docs/styles/spy-titles.jpg" width="220"><br>`spy-titles` | 네 가지 색 종이 오리기, 장면마다 바뀌는 바탕 | 도입 훅, 미스터리, 대결 구도 |
| <img src="docs/styles/shadow-puppet.jpg" width="220"><br>`shadow-puppet` | 등잔불이 비치는 천 스크린, 빛이 투과되는 가죽 인형 | 우화, 유래, 역사 |
| <img src="docs/styles/ascii-crt.jpg" width="220"><br>`ascii-crt` | 모든 선이 문자 격자로 찍히는 호박색 CRT | AI, 코드, 자동화, 로그 |

## 영상 생성 모델 도구와 다른 점

- **결과가 늘 같습니다.** 같은 장면표는 프레임까지 똑같은 영상을 만듭니다. 오타를 고치고 다시 렌더해도 다른 부분은 바뀌지 않습니다.
- **GPU도 유료 API도 영상 모델도 필요 없습니다.** 프레임을 CPU 캔버스에 그려 FFmpeg로 넘깁니다. 데모의 8가지 스타일은 일반 데스크톱에서 스타일마다 약 10~60초 걸렸습니다.
- **글자는 실제 글자입니다.** 제목, 이름표, 자막을 글꼴로 찍기 때문에 숫자와 철자가 틀어지지 않습니다.
- **렌더 전에 검사합니다.** 화면 밖 요소, 자막이 내용을 가리는 경우, 너무 작은 글자, 넘치는 글자, 멈춘 화면을 찾아 가능하면 자동으로 고치고, 남은 오류가 있으면 렌더하지 않습니다. 절반쯤 빈 장면은 어떻게 채우면 되는지 알려 주는 경고를 냅니다.
- **자막이 함께 나옵니다.** 렌더할 때마다 `.srt` 파일과 영상에 입힌 자막이 나오며, 영어와 한국어를 지원합니다.
- **계속 움직입니다.** 장면은 제목과 첫 그림이 함께 나오며 시작하고, 그다음에는 느린 카메라 이동(확대 또는 좌우 이동)과 아이콘·화살표·강조 표시의 작은 움직임이 멈춘 그림을 받쳐 줍니다. 끄려면 `camera: "still"` 또는 `fx.idle: false`를 씁니다.

## 작동 방식

`storyboard.json`은 1920x1080 공간에서 **무엇**(글자, 상자, 원, 화살표, 선, 아이콘, 막대 차트, 강조, 이미지)이 **어디에** **언제** 나오는지와 장면별 내레이션을 적습니다. 스타일은 그것이 **어떻게** 보이고 움직이는지를 정합니다. 명령줄 도구가 음성의 실제 길이를 재고, 요소마다 해당 문장에 맞춰 시간을 정하고, 배치를 검사한 뒤 렌더합니다. 에이전트용 장면표 안내는 [SKILL.md](skills/explainer-studio/SKILL.md)에, 복사해 쓸 수 있는 골격과 필드 표와 좌표가 있는 레이아웃 레시피 6개는 [storyboard-recipes.md](skills/explainer-studio/reference/storyboard-recipes.md)에 있습니다.

음성은 `edge`(Microsoft Edge 신경망 음성을 비공식 엔드포인트로 씁니다. 수익 목적으로 공개하기 전에 이용 조건을 확인하십시오. 영어와 한국어를 자동으로 고르고 `WV_EDGE_VOICE`로 지정할 수도 있습니다), `sapi`(Windows), `cmd`(`WV_TTS_CMD='mytts --text {text} --out {out}'`처럼 내 컴퓨터의 아무 TTS), `silent` 중에서 고릅니다.

## 한계

- 지금은 가로 1920x1080만 지원합니다.
- 캐릭터 리깅, 3D, 화면 녹화는 없습니다. 그릴 수 있는 요소는 위에 적은 것뿐이고, 움직임은 느린 카메라와 작은 반복 동작이며 키프레임 애니메이션이 아닙니다.
- 자막 시간은 문장 길이에 비례해 나눈 값이며 단어 단위로 맞춘 것이 아닙니다.
- 검사를 통과했다고 영상을 직접 본 것과 같지 않습니다. 공개하기 전에 직접 보십시오.

## 출처

- 스타일 목록과 각 스타일의 시각 언어는 [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)(코드 MIT, 문서 CC BY 4.0)를 참고했습니다. 이 저장소의 문서와 요소 기반 엔진은 처음부터 새로 썼습니다.
- [Rough.js](https://github.com/rough-stuff/rough)(MIT), [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)(MIT), [FFmpeg](https://ffmpeg.org/), [msedge-tts](https://github.com/Migushthe2nd/MsEdgeTTS)(MIT), [zod](https://github.com/colinhacks/zod)(MIT)를 씁니다.
- SIL Open Font License 1.1 글꼴: Gaegu, 나눔고딕 / 나눔명조 / 나눔손글씨 펜 / 나눔고딕코딩, IBM Plex Sans KR, 블랙한산스. 라이선스 파일은 `assets/fonts/`에 있습니다.

## 만든 사람

**리도(Reedo)** · [YouTube @Reedodev](https://www.youtube.com/@Reedodev) · [Threads @reedo.dev](https://www.threads.com/@reedo.dev) · [GitHub @reedodev](https://github.com/reedodev)

같이 만든 다른 스킬: [옵시디언 LLM 위키](https://github.com/reedodev/obsidian-llm-wiki) · [옵시디언 3D 지식그래프](https://github.com/reedodev/obsidian-brain-3d) · [노트 먼저 찾아보기](https://github.com/reedodev/vault-recall) · [작업 기록 강의자료](https://github.com/reedodev/work-to-lecture-deck) · [한국어 말투 점검](https://github.com/reedodev/korean-tone-check) · [네이버 황금키워드](https://github.com/reedodev/naver-golden-keywords) · [한글 양식 채우기](https://github.com/reedodev/hwpx-form-fill) · [TTS 끝소리 고치기](https://github.com/reedodev/tts-tail-fix) · [카드뉴스 렌더](https://github.com/reedodev/html-card-render) · [영상 비율 검사](https://github.com/reedodev/social-video-gate) · [유튜브 게시 점검](https://github.com/reedodev/youtube-publish-checklist)

MIT 라이선스입니다. 외부 글꼴과 라이브러리는 각자의 라이선스를 따릅니다.
