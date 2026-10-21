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
| `circle` | id, x, y, w, h | fill, stroke, label, labelSize | w = h for a circle. Without `labelSize` the label shrinks on its own (down to 28 px) until it fits the inner 80% of the width. The longest single word that still fits is about w/23 Latin characters in the widest style (spy-titles) and about w/19 in the others, so a 260 px circle holds "Evaporation" (11 letters) but not "Condensation" (12) in spy-titles, and a 240 px circle holds about 10 letters; w/45 Korean syllables per line is a safe guess, two lines at most. `build` measures the label in all 8 styles and the error names the style that fails. Make the circle bigger (about 290 px for a 12-letter word), shorten the word, or use a rectangle |
| `line` | id, points `[[x,y],...]` | stroke, dashed | |
| `arrow` | id, and `from`/`to` `[x,y]` or `fromTarget`/`toTarget` | bend (px, curve), label, labelSize, stroke | `toTarget:"box1"` or `"chart1:blue"` ends the arrow 10 px outside that shape or bar, so you never compute edge coordinates. A target always wins over a stored `from`/`to` |
| `icon` | id, x, y, w, h, icon | stroke | icons: chat, robot, gear, tool, wrench, search, database, loop, refresh, check, warning, document, globe, lightbulb, lock, clock, folder, scale, door, bell, slides |
| `chart` | id, x, y, w, h, data `[{label, value, color?}]` | chartType (`bar`), unit | only real, sourced numbers. Value labels (with `unit`) sit above the bars, category labels under them, value labels 38 px or more, category labels 34 px or more. With four bars or fewer the bars are wide (80% of a slot) and tightly spaced. A bar is never thinner than 12% of the plot height, so 4 vs 60 stays visible; read the exact numbers from the value labels |
| `highlight` | id, and `target` or x, y, w, h | style (`underline`/`circle`/`marker`), fill | `target` is an element id, a chart bar (`"chart1:blue"`, by label, or `"chart1:2"`, by index from 0), or a bar with its two labels (`"chart1:blue+labels"`, the right choice for a circle so it does not cut through the labels) |
| `image` | id, x, y, w, h, src | frame (`card`/`panel`/`none`), fit, caption, tilt | src is relative to the project folder |
| `sticker` | id, x, y, w, h, sticker | | PNG in `stickers/` |

Common to every element: `cue` (sentence number that triggers it), `dur` (cap its draw time in seconds), `fill`/`stroke`, `bleed`, `note`, `idle` (`false` stops its after-drawing motion).

Scene and storyboard options: `camera` (`push` default, `pan-left`, `pan-right`, `still`; swiss-motion and ascii-crt default to `still`), root `drawBy`, `fx.idle: false`, `fx.camera: false`.

Colours are names only: `black`, `yellow`, `blue`, `green`, `red`, `grey`, `white`. Each style paints them in its own palette.

## Six layout recipes

Title for every recipe: `text`, role title, x 120, y 140, w 1500, h 90, fontSize 72 (counted below).

1. **A vs B comparison (8 elements).** Title. Two boxes at x 120 and 1020, y 260, w 780, h 360, different fills, labels of 2-6 words. Icons under each at x 440 / 1340, y 650, 150x150 (`warning` vs `check`). One short text under each icon: x 220 / 1120, y 820, w 580, h 80, fontSize 44, centred. A `highlight` circle on the winner.
2. **Process in 4 steps and a takeaway band (9 elements).** Title. Four boxes at x = 120 + k*430 (k = 0..3), y 270, w 370, h 330, labels "1 ...", "2 ...", different fills. Three arrows from [495 + k*430, 435] to [545 + k*430, 435]. A wide takeaway box x 120, y 670, w 1680, h 230, grey, `labelSize` 56, with the one sentence you want people to remember. That fills the lower third; add icons only if you have elements to spare (the limit is 12).
3. **Cycle across the full width (12 elements, at the limit).** Title. Four circles 240x240: Plan x 840 y 235 (top), Act x 1190 y 440 (right), Check x 840 y 645 (bottom), Fix x 490 y 440 (left); the gaps of about 160 px leave room for visible arrows. Keep each label to 10 letters or fewer (see the circle row above). Four curved arrows between neighbours: `fromTarget` the circle it leaves, `toTarget` the circle it reaches, `bend` 60 (so Plan to Act, Act to Check, Check to Fix, Fix to Plan). A `loop` icon 140x140 in the centre at x 890, y 490. A goal box at the far left x 120, y 430, w 330, h 260 and a result box at the far right x 1470, y 430, w 330, h 260, with labels of 2-4 words so no word is left alone on a second line. Together the boxes and the ring use the full 120-1800 width. Do not make the circles bigger than about 260 px: the arrows between them shrink to stubs.
4. **Chart and callout (7 elements).** Title. Chart x 120, y 260, w 1200, h 620 with three bars (400 px per slot, bars 320 px wide, the plot is 494 px high; value labels 38 px above the bars, category labels 34 px under them). Callout box x 1420, y 330, w 420, h 240, yellow, with the takeaway in words. An arrow `from [1420, 520]`, `toTarget "chart:Fresh liquid"` (use the label you gave the bar): it ends just outside the bar and cannot cut through another bar. A `highlight` with `target "chart:Fresh liquid+labels"`, style `circle`, around that bar and its two labels (it stays inside that bar's slot, so it never touches the neighbouring bar). An icon x 1560, y 640, 150x150 (`lightbulb`, `check`). Source text x 140, y 890, w 1200, h 50, fontSize 30. A circle `highlight` with `+labels` is clean around a short bar like this one. Around a tall bar the ellipse narrows at the bottom and cuts through the category label, so for the tallest bar skip the highlight and let the arrow point (`examples/sky-blue` does this). Very uneven data such as 97 / 2 / 1 works: the small bars keep a minimum height and the value labels tell the truth. A working copy of this recipe is in `examples/sky-blue`.
5. **Cross-section, nested (10 elements).** Title. Concentric circles centred at (560, 590): 640, 400 and 140 px wide (boxes x 240 y 270, x 360 y 390, x 490 y 520). Three label texts on the right at x 1040, y 300 / 520 / 740, w 760, h 90, fontSize 52, each with an arrow from the label back to its ring.
6. **Timeline (10 elements).** Title. A line from [140, 600] to [1780, 600]. Four dots (circles 70x70) on the line at x 225, 665, 1105, 1545, y 565; give the latest dot a different fill. To point at one milestone, add a `highlight` circle with `target` set to that **dot** (never to a text, whose box is wide and draws a stray ellipse across the line). Four texts, each holding the year and the event together ("1988\nFirst fiber across the Atlantic"), w 420, h 240, fontSize 46, align center, alternating above and below the line: x 50, y 300 (above); x 490, y 670 (below); x 930, y 300 (above); x 1370, y 670 (below).

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

`build` also writes `contact-sheet.png` next to `final.mp4` (inside `variants/<style>/` for another style): one frame at 70% of every scene, three per row. Look at it before you watch the video: lopsided or empty scenes show up at a glance.

- `too many elements (14 elements, limit 12 ...)`: merge short texts into box labels or split the scene.
- `text wider than box (style spy-titles: ... at most about 11 of 12 characters fit per line in spy-titles ...)`: the text was measured in all 8 styles and this one is too wide even at the smallest readable size (28 px). Widen the box, shorten the text, or add a space so it can wrap. Fix it now: the same storyboard then renders in every style.
- `invalid drawOrder (missing from drawOrder: b; unknown ids in drawOrder: zz ...)`: the message names the ids; `drawOrder` must list every element id exactly once.

## Which warnings are fine

- `overlap` is listed only when it looks like a fault, and every line says what to check: `the two shapes overlap by 400x120px`, `about 340px of the line runs through the shape`, `the line crosses the bar "red"`. Intended overlaps are not warnings; the build prints what it counted ("intended overlaps counted (not warnings): scene-03: ar arrow aims at chart bar ...; scene-03: hb highlight on chart:...", up to 8, then "+N more") so you can check the count: an arrow that starts or ends inside a shape, a shape nested inside a bigger one, a dot sitting on a timeline line, an arrow aimed at a chart bar with `toTarget`, and a `highlight` on its target. An arrow that stops exactly at a shape's edge does not overlap at all and is not counted. All six recipes above build with 0 errors and 0 warnings.
- `sparse scene` / `few visual elements`: fix them unless the emptiness is the point (a one-word title card).
- Errors (out of frame, caption zone, small font, mid-word caption, static over 10 s) block the render and must be fixed.
