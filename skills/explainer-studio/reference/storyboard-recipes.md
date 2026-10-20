# Storyboard reference and layout recipes

Everything here uses the 1920x1080 reference canvas.

- **Title** sits at x 120, y 140 (the engine moves anything higher down to y 140).
- **Content area** is x 120-1800, y 250-920. Fill it down to the lower third; the band below 960 is the caption strip.
- Keep the top-right 320x130 corner free (watermark zone). Text must be 28 px or larger.
- **At most 12 elements per scene, counting the title and any caption text.** Every recipe below states its count.

## Minimal valid storyboard (copy, then edit)

```json
{
  "version": 1,
  "title": "Why is the sky blue?",
  "topic": "Why is the sky blue?",
  "language": "en",
  "style": "whiteboard",
  "scenes": [
    {
      "id": "scene-01", "section": "hook", "layout": "free", "duration": 0,
      "narration": "The sky is blue because air scatters blue light far more than red.",
      "elements": [
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 140, "w": 1500, "h": 90, "text": "Air scatters blue", "fontSize": 72 },
        { "id": "sun", "type": "circle", "x": 140, "y": 330, "w": 360, "h": 360, "fill": "yellow", "label": "Sun" },
        { "id": "a1", "type": "arrow", "from": [530, 510], "to": [1120, 510], "label": "red passes", "labelSize": 36, "stroke": "red" },
        { "id": "card", "type": "rectangle", "x": 1180, "y": 300, "w": 620, "h": 420, "fill": "blue", "label": "blue scatters about 6x more" },
        { "id": "globe", "type": "icon", "icon": "globe", "x": 1430, "y": 760, "w": 130, "h": 130 },
        { "id": "hl", "type": "highlight", "target": "card", "style": "circle" }
      ],
      "drawOrder": ["title", "sun", "a1", "card", "globe", "hl"]
    },
    {
      "id": "scene-02", "section": "concept", "layout": "free", "duration": 0,
      "narration": "Sunlight looks white, but it mixes every color.",
      "elements": [
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 140, "w": 1500, "h": 90, "text": "White light is every color", "fontSize": 72 },
        { "id": "r", "type": "rectangle", "x": 120, "y": 300, "w": 390, "h": 320, "fill": "red", "label": "red" },
        { "id": "y", "type": "rectangle", "x": 540, "y": 300, "w": 390, "h": 320, "fill": "yellow", "label": "yellow" },
        { "id": "g", "type": "rectangle", "x": 960, "y": 300, "w": 390, "h": 320, "fill": "green", "label": "green" },
        { "id": "b", "type": "rectangle", "x": 1380, "y": 300, "w": 390, "h": 320, "fill": "blue", "label": "blue" },
        { "id": "bulb", "type": "icon", "icon": "lightbulb", "x": 880, "y": 690, "w": 160, "h": 160 }
      ],
      "drawOrder": ["title", "r", "y", "g", "b", "bulb"]
    },
    {
      "id": "scene-03", "section": "summary", "layout": "free", "duration": 0,
      "narration": "Short waves scatter most, so blue fills the sky.",
      "elements": [
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 140, "w": 1500, "h": 90, "text": "Short waves scatter most", "fontSize": 72 },
        { "id": "chart", "type": "chart", "chartType": "bar", "x": 120, "y": 260, "w": 1040, "h": 640, "data": [ { "label": "red 700 nm", "value": 1, "color": "red" }, { "label": "blue 450 nm", "value": 5.9, "color": "blue" } ] },
        { "id": "note", "type": "rectangle", "x": 1240, "y": 300, "w": 560, "h": 300, "fill": "yellow", "label": "relative scattering" },
        { "id": "ar", "type": "arrow", "from": [1240, 560], "to": [1000, 660] }
      ],
      "drawOrder": ["title", "chart", "note", "ar"]
    }
  ]
}
```

Fields the CLI fills in: `duration` (from the voice or the silent estimate), every element's `start`/`end`. You can leave them out.

## Element fields

| type | required | optional | notes |
|---|---|---|---|
| `text` | id, x, y, w, h, text | fontSize (56), role (`title`/`heading`/`body`/`label`/`caption`), align, color | title 64-80 px, body 44-56, caption 28-32. `\n` starts a new line |
| `rectangle` | id, x, y, w, h | fill, stroke, label, labelSize, paper | without `labelSize` the label grows with the box (42-64 px) and shrinks until it fits |
| `circle` | id, x, y, w, h | fill, stroke, label, labelSize | w = h for a circle. Labels fit in the inner 72%: about w/30 Latin characters or w/50 Korean syllables per line, two lines at most; use a rectangle for longer text |
| `line` | id, points `[[x,y],...]` | stroke, dashed | |
| `arrow` | id, from `[x,y]`, to `[x,y]` | bend (px, curve), label, labelSize, stroke | overlap checks use the drawn line, so arrows may pass close to boxes |
| `icon` | id, x, y, w, h, icon | stroke | icons: chat, robot, gear, tool, wrench, search, database, loop, refresh, check, warning, document, globe, lightbulb, lock, clock, folder, scale, door, bell, slides |
| `chart` | id, x, y, w, h, data `[{label, value, color?}]` | chartType (`bar`), unit | only real, sourced numbers |
| `highlight` | id, and `target` (an element id) or x, y, w, h | style (`underline`/`circle`/`marker`), fill | drawn over its target |
| `image` | id, x, y, w, h, src | frame (`card`/`panel`/`none`), fit, caption, tilt | src is relative to the project folder |
| `sticker` | id, x, y, w, h, sticker | | PNG in `stickers/` |

Common to every element: `cue` (sentence number that triggers it), `dur` (cap its draw time in seconds), `fill`/`stroke`, `bleed`, `note`, `idle` (`false` stops its after-drawing motion).

Scene and storyboard options: `camera` (`push` default, `pan-left`, `pan-right`, `still`; swiss-motion and ascii-crt default to `still`), root `drawBy`, `fx.idle: false`, `fx.camera: false`.

Colours are names only: `black`, `yellow`, `blue`, `green`, `red`, `grey`, `white`. Each style paints them in its own palette.

## Six layout recipes

Title for every recipe: `text`, role title, x 120, y 140, w 1500, h 90, fontSize 72 (counted below).

1. **A vs B comparison (8 elements).** Title. Two boxes at x 120 and 1020, y 260, w 780, h 360, different fills, labels of 2-6 words. Icons under each at x 440 / 1340, y 650, 150x150 (`warning` vs `check`). One short text under each icon: x 220 / 1120, y 820, w 580, h 80, fontSize 44, centred. A `highlight` circle on the winner.
2. **Process in 4 steps (12 elements, at the limit).** Title. Boxes at x = 120 + k*430 (k = 0..3), y 280, w 370, h 280, labels "1 ...", "2 ...". Three arrows from [490 + k*430, 420] to [550 + k*430, 420]. Icons under each box at x 230 + k*430, y 620, 150x150. There is no room for a caption; put the takeaway in the narration.
3. **Cycle (11 elements).** Title. Four circles 220x220 centred on (960, 360) top, (1230, 590) right, (960, 820) bottom, (690, 590) left (so boxes x 850 y 250, x 1120 y 480, x 850 y 710, x 580 y 480). Four curved arrows (`bend` 60) between neighbours. A `loop` icon 130x130 in the centre at x 895, y 525. The goal box on the far left: x 120, y 480, w 380, h 220.
4. **Chart and callout (7 elements).** Title. Chart x 120, y 260, w 1040, h 640. Callout box x 1240, y 280, w 560, h 300, yellow, with the takeaway in words. An arrow from the callout to the important bar and a `highlight` circle on that bar. An icon x 1450, y 620, 140x140 (`lightbulb`, `check`). Source text x 1240, y 820, w 560, h 80, fontSize 30.
5. **Cross-section, nested (10 elements).** Title. Concentric circles centred at (560, 590): 640, 400 and 140 px wide (boxes x 240 y 270, x 360 y 390, x 490 y 520). Three label texts on the right at x 1040, y 300 / 520 / 740, w 760, h 90, fontSize 52, each with an arrow from the label back to its ring.
6. **Timeline (10 elements).** Title. A line from [140, 600] to [1780, 600]. Four dots (circles 70x70) on the line at x 225, 665, 1105, 1545, y 565; give the latest dot a different fill. Four texts, each holding the year and the event together ("1988\nFirst fiber across the Atlantic"), w 420, h 240, fontSize 46, align center, alternating above and below the line: x 50, y 300 (above); x 490, y 670 (below); x 930, y 300 (above); x 1370, y 670 (below).

Rule of thumb: every scene should cover at least a third of the frame and have 4-9 non-text elements. Validation warns (`sparse scene`, `few visual elements`) when it doesn't.

## Timing model

- Narration is split into sentences at `.`, `!`, `?`. Scene length comes from the voice audio, or from the silent estimate.
- A leading title types in about one second while the first visual starts at the same time, so no scene opens on a lone title.
- By default every element is fully drawn by 65% of the scene (8 s before the end on long scenes), in `drawOrder`. During the rest of the scene the camera pushes in slowly and icons, highlights and arrows keep a small idle motion.
- `cue: n` starts an element when sentence n (0-based) begins. Use it to sync a reveal to a sentence.
- `dur: 0.6` makes one element snap in quickly. `"drawBy": 0.8` at the storyboard root slows every scene down.

## Length

- Silent mode estimates English at about 2.6 words per second and Korean at about 6.5 syllables per second, plus 0.2 s per scene.
- A 40-second English video is about 100 words of narration in total: 6 scenes of about 16 words, two short sentences each. A 40-second Korean video is about 250 syllables.
- Real voices vary; build once with the voice you will use and adjust.

## Reading the build output

`build`, `render` and `validate` end with a short list: `N error(s), M warning(s)` and one line per issue. Add `--json` for the full objects. The complete report is always written to `validation-report.md`.

- `too many elements (14 elements, limit 12 ...)`: merge short texts into box labels or split the scene.
- `text wider than box (... about 9 of 22 characters fit per line ...)`: widen the box, shorten the text, or add a space so it can wrap.

## Which warnings are fine

- `overlap` between a highlight and its target, nested circles, arrows that touch the circles of a cycle, dots sitting on a timeline line, or a label you placed inside a box on purpose: fine after you look at the frame. All six recipes above build with 0 errors; their remaining warnings are of this kind.
- `sparse scene` / `few visual elements`: fix them unless the emptiness is the point (a one-word title card).
- Errors (out of frame, caption zone, small font, mid-word caption, static over 10 s) block the render and must be fixed.
