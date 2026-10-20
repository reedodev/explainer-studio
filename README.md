<p align="center"><img src="docs/eight-styles.gif" alt="The same storyboard rendered in eight hand-drawn styles, playing side by side" width="100%"></p>

<p align="center">
<a href="https://github.com/reedodev/explainer-studio/actions/workflows/test.yml"><img src="https://github.com/reedodev/explainer-studio/actions/workflows/test.yml/badge.svg" alt="test"></a>
<img src="https://img.shields.io/badge/Claude_Code-skill-2547F4" alt="Claude Code skill">
<img src="https://img.shields.io/badge/GPU-not_needed-black" alt="No GPU">
<img src="https://img.shields.io/badge/license-MIT-black" alt="MIT">
</p>

# Explainer Studio

**One line in, a narrated explainer video out, in eight hand-drawn styles.**

Give your coding agent a topic like *"How does a fiber-optic cable carry light?"*. It writes a storyboard, and this engine draws it stroke by stroke as a whiteboard sketch, a blueprint, an ink-wash painting, a 60s spy title sequence and more, with voice-over and captions, straight to MP4. The demo above is one storyboard file rendered eight times (silent, with burned-in captions). Every number in it is sourced: see `examples/fiber-optics/research/sources.json`. A full single-style render is in [`docs/fiber-optics-blueprint.mp4`](docs/fiber-optics-blueprint.mp4), and a narrated Korean example (narrated in the author's own voice, made with a local voice model; any local TTS can be plugged in with `--tts cmd`) is in [`docs/ai-agent-vs-chatbot-ko-voice.mp4`](docs/ai-agent-vs-chatbot-ko-voice.mp4).

## Quick start

```bash
git clone https://github.com/reedodev/explainer-studio && cd explainer-studio
npm ci                                   # needs Node 20+ and FFmpeg on PATH
npm run es -- build examples/fiber-optics --tts silent --style blueprint
```

The video lands in `examples/fiber-optics/variants/blueprint/final.mp4` with burned-in captions (the storyboard's own `style` renders to `final.mp4` in the project folder; every other style goes to `variants/<style>/final.mp4`). For a voice, swap `--tts silent` for `sapi` (Windows, offline), `cmd` (any local TTS) or `edge` (online; it depends on an unofficial endpoint that returned HTTP 403 when last checked on 2026-10-20). Then try the same file in another look:

```bash
npm run es -- render examples/fiber-optics --style ink-wash        # -> variants/ink-wash/final.mp4
npm run es -- styleframes examples/fiber-optics --styles all       # one contact sheet, all 8 styles
npm run es -- build examples/ai-agent-vs-chatbot-ko --tts silent  # Korean example (5 scenes)
npm run es -- init "Why do cats purr?" --slug cats                 # 3-scene starter in output/cats, prints the next command
```

With Claude Code, install the skill and just ask: *"make an explainer video about how vaccines train the immune system, blueprint style"*.

```
/plugin marketplace add reedodev/explainer-studio
/plugin install explainer-studio@explainer-studio
```

## A second example: written only from the layout recipes

<p align="center"><img src="docs/sky-blue-two-styles.gif" alt="Why is the sky blue? rendered in ink-wash and whiteboard" width="100%"></p>

`examples/sky-blue` (6 scenes, 45 s, every number sourced in `research/sources.json`) was written by following only [the storyboard recipes](skills/explainer-studio/reference/storyboard-recipes.md): a results-first hook, a spectrum, a chart with a callout, an A-vs-B comparison, the sunset path and a recap. Each element finishes drawing by 65% of its scene, so most of every scene shows the finished picture.

## Eight styles, one storyboard

| Style | Look | Good for |
|---|---|---|
| <img src="docs/styles/whiteboard.jpg" width="220"><br>`whiteboard` | Black marker on a white board, drawn one stroke at a time | Concepts, lessons, comparisons |
| <img src="docs/styles/swiss-motion.jpg" width="220"><br>`swiss-motion` | 12-column grid, black blocks, one red, snappy motion | One-sentence messages, principles |
| <img src="docs/styles/blueprint.jpg" width="220"><br>`blueprint` | White drafting lines on cyanotype blue, typed annotations | How things work, systems, architecture |
| <img src="docs/styles/ink-wash.jpg" width="220"><br>`ink-wash` | Brush strokes that swell and taper, bleeding ink, a red seal | Reflection, attitude, insight |
| <img src="docs/styles/urban-sketch.jpg" width="220"><br>`urban-sketch` | Sepia pen lines with watercolour that spills over | Stories from experience, everyday topics |
| <img src="docs/styles/spy-titles.jpg" width="220"><br>`spy-titles` | Four-colour cut paper, a new background every scene | Hooks, mysteries, versus stories |
| <img src="docs/styles/shadow-puppet.jpg" width="220"><br>`shadow-puppet` | Lamp-lit screen, leather puppets with light shining through | Fables, origins, history |
| <img src="docs/styles/ascii-crt.jpg" width="220"><br>`ascii-crt` | Amber CRT where every line is a character grid | AI, code, automation, logs |

## Why it is different from video-model tools

- **Deterministic.** The same storyboard gives the same video, frame for frame. Fix a typo and re-render; nothing else changes.
- **No GPU, no paid API, no video model.** Frames are drawn on a CPU canvas and piped to FFmpeg. The demo's eight styles rendered in about 10 to 60 seconds each on a desktop PC.
- **Text is real text.** Titles, labels and captions are typeset, never hallucinated pixels, so numbers and spelling stay correct.
- **Checks before it renders.** Off-screen elements, captions colliding with content, tiny fonts, overflowing text and frozen screens are caught and auto-fixed where possible; remaining errors block the render. Half-empty scenes get a warning that says how to fill them.
- **Captions included.** An `.srt` file and burned-in captions come with every render, in English or Korean.

## How it works

`storyboard.json` says **what** appears **where** and **when** (text, boxes, circles, arrows, lines, icons, bar charts, highlights, images) in a 1920x1080 space, plus the narration for each scene. A style says **how** it looks and moves. The CLI measures the real length of the voice track, times each element to its sentence, validates the layout, and renders. The full storyboard guide for agents is in [SKILL.md](skills/explainer-studio/SKILL.md), with a copy-paste skeleton, a field table and six layout recipes with coordinates in [storyboard-recipes.md](skills/explainer-studio/reference/storyboard-recipes.md).

Voices: `edge` (Microsoft Edge neural voices via an unofficial endpoint: check the terms before commercial use; English and Korean picked automatically, or set `WV_EDGE_VOICE`), `sapi` (Windows), `cmd` (any local TTS through `WV_TTS_CMD='mytts --text {text} --out {out}'`), or `silent`.

## Limitations

- Landscape 1920x1080 only for now.
- No character rigs, 3D or screen recordings; the drawable elements are listed above.
- Caption timing is proportional to sentence length, not word-level forced alignment.
- Passing the checks is not the same as watching the video. Watch it before you publish.

## Credits

- The style catalogue and the visual language of each style were informed by [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (code MIT, docs CC BY 4.0). The documents and the element-based engine here were written from scratch.
- [Rough.js](https://github.com/rough-stuff/rough) (MIT), [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (MIT), [FFmpeg](https://ffmpeg.org/), [msedge-tts](https://github.com/Migushthe2nd/MsEdgeTTS) (MIT), [zod](https://github.com/colinhacks/zod) (MIT).
- Fonts under the SIL Open Font License 1.1: Gaegu, Nanum Gothic / Myeongjo / Pen Script / Gothic Coding, IBM Plex Sans KR, Black Han Sans. Licence files are in `assets/fonts/`.

---

## 한국어

**한 줄 주제를 넣으면 내레이션과 자막이 들어간 설명 영상이 8가지 손그림 스타일로 나옵니다.**

에이전트가 주제를 받아 장면표(`storyboard.json`)를 쓰면, 이 엔진이 그 장면표를 화이트보드, 설계도, 수묵화, 첩보영화 오프닝 같은 스타일로 한 획씩 그려 MP4로 만듭니다. 맨 위 데모는 장면표 파일 하나를 8번 렌더한 결과이고, 두 번째 데모(`examples/sky-blue`)는 배치 레시피만 보고 새로 쓴 장면표입니다.

- **GPU, 영상 생성 모델, 유료 API가 필요 없습니다.** CPU로 그린 프레임을 FFmpeg로 묶기 때문에 같은 입력이면 같은 영상이 나옵니다.
- **글자는 실제 글자로 들어갑니다.** 제목, 이름표, 자막이 깨지거나 철자가 틀리지 않습니다.
- **렌더 전에 검사합니다.** 화면 밖 요소, 자막 자리 침범, 작은 글자, 글자 넘침, 10초 넘게 멈춘 화면을 찾아 고치고, 남은 오류가 있으면 렌더하지 않습니다.
- **한국어와 영어 자막을 모두 지원합니다.** 음성은 `edge`(비공식 엔드포인트이므로 수익 목적 공개 전 이용 조건 확인), `sapi`(Windows), `cmd`(내 컴퓨터의 TTS 명령), `silent` 중에서 고릅니다.

```bash
npm ci
npm run es -- build examples/fiber-optics --tts silent --style blueprint
npm run es -- styleframes examples/fiber-optics --styles all
```

준비물, 장면표 쓰는 법, 스타일 고르는 법, "이렇게 말하면 이렇게 바뀝니다" 표는 [SKILL.md](skills/explainer-studio/SKILL.md)에 있습니다. 공개하기 전에는 완성 영상을 처음부터 끝까지 직접 보고 듣습니다. 검사 통과는 시청 확인을 대신하지 못합니다.

만든 사람: **Reedo** · [YouTube @Reedodev](https://www.youtube.com/@Reedodev) · [GitHub @reedodev](https://github.com/reedodev)

MIT License. Third-party fonts and libraries keep their own licences.
