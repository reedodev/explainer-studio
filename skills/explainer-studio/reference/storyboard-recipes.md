# Storyboard reference and layout recipes

Everything here uses the 1920x1080 reference canvas. Keep elements inside x 100-1820, y 60-930 (the band below 960 is the caption strip) and keep the top-right 320x130 corner free (watermark zone). Text must be 28 px or larger. At most 12 elements per scene.

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
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 70, "w": 1400, "h": 100, "text": "Air scatters blue", "fontSize": 72 },
        { "id": "sun", "type": "circle", "x": 160, "y": 300, "w": 300, "h": 300, "fill": "yellow", "label": "Sun", "labelSize": 48 },
        { "id": "a1", "type": "arrow", "from": [480, 450], "to": [1100, 450], "label": "red passes", "labelSize": 34, "stroke": "red" },
        { "id": "card", "type": "rectangle", "x": 1220, "y": 300, "w": 580, "h": 300, "fill": "blue", "label": "blue scatters about 6x more", "labelSize": 44 },
        { "id": "hl", "type": "highlight", "target": "card", "style": "circle" }
      ],
      "drawOrder": ["title", "sun", "a1", "card", "hl"]
    },
    {
      "id": "scene-02", "section": "concept", "layout": "free", "duration": 0,
      "narration": "Sunlight looks white, but it mixes every color.",
      "elements": [
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 70, "w": 1400, "h": 100, "text": "White light is every color", "fontSize": 72 },
        { "id": "r", "type": "rectangle", "x": 120, "y": 320, "w": 380, "h": 220, "fill": "red", "label": "red" },
        { "id": "y", "type": "rectangle", "x": 540, "y": 320, "w": 380, "h": 220, "fill": "yellow", "label": "yellow" },
        { "id": "g", "type": "rectangle", "x": 960, "y": 320, "w": 380, "h": 220, "fill": "green", "label": "green" },
        { "id": "b", "type": "rectangle", "x": 1380, "y": 320, "w": 380, "h": 220, "fill": "blue", "label": "blue" }
      ],
      "drawOrder": ["title", "r", "y", "g", "b"]
    },
    {
      "id": "scene-03", "section": "summary", "layout": "free", "duration": 0,
      "narration": "Short waves scatter most, so blue fills the sky.",
      "elements": [
        { "id": "title", "type": "text", "role": "title", "x": 120, "y": 70, "w": 1400, "h": 100, "text": "Short waves scatter most", "fontSize": 72 },
        { "id": "chart", "type": "chart", "chartType": "bar", "x": 140, "y": 230, "w": 1000, "h": 580, "data": [ { "label": "red 700 nm", "value": 1, "color": "red" }, { "label": "blue 450 nm", "value": 5.9, "color": "blue" } ] },
        { "id": "note", "type": "rectangle", "x": 1240, "y": 300, "w": 560, "h": 260, "fill": "yellow", "label": "relative scattering", "labelSize": 40 },
        { "id": "ar", "type": "arrow", "from": [1240, 520], "to": [1000, 640] }
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
| `text` | id, x, y, w, h, text | fontSize (56), role (`title`/`heading`/`body`/`label`/`caption`), align, color | title 64-80 px, body 40-48, caption 28-32 |
| `rectangle` | id, x, y, w, h | fill, stroke, label, labelSize (42), paper | the label is centred and wrapped inside the box |
| `circle` | id, x, y, w, h | fill, stroke, label, labelSize | w = h for a circle, otherwise an ellipse |
| `line` | id, points `[[x,y],...]` | stroke, dashed | |
| `arrow` | id, from `[x,y]`, to `[x,y]` | bend (px, curve), label, labelSize, stroke | overlap checks use the drawn line, so arrows may pass close to boxes |
| `icon` | id, x, y, w, h, icon | stroke | icons: chat, robot, gear, tool, wrench, search, database, loop, refresh, check, warning, document, globe, lightbulb, lock, clock, folder, scale, door, bell, slides |
| `chart` | id, x, y, w, h, data `[{label, value, color?}]` | chartType (`bar`), unit | only real, sourced numbers |
| `highlight` | id, and `target` (an element id) or x, y, w, h | style (`underline`/`circle`/`marker`), fill | drawn over its target |
| `image` | id, x, y, w, h, src | frame (`card`/`panel`/`none`), fit, caption, tilt | src is relative to the project folder |
| `sticker` | id, x, y, w, h, sticker | | PNG in `stickers/` |

Common to every element: `cue` (sentence number that triggers it), `dur` (cap its draw time in seconds), `fill`/`stroke`, `bleed`, `note`.

Colours are names only: `black`, `yellow`, `blue`, `green`, `red`, `grey`, `white`. Each style paints them in its own palette.

## Six layout recipes

Title for all recipes: `text`, role title, x 120, y 70, w 1400, h 100, fontSize 72. Captions or sources: `text`, role caption, x 140, y 870, w 1300, h 50, fontSize 30.

1. **A vs B comparison.** Two boxes x 120 / 1040, y 230, w 760, h 300 (fills of different colours). Icons under each at x 450 / 1370, y 570, 110x110 (`warning` vs `check`). One short label under each icon at y 710. A `highlight` circle on the winner.
2. **Process in 4 steps.** Boxes at x = 120 + k*430 (k = 0..3), y 300, w 360, h 200, labels "1 ...", "2 ...". Arrows from [480 + k*430, 400] to [550 + k*430, 400]. Icons under each box at x 250 + k*430, y 560, 100x100. One caption line at y 760.
3. **Cycle.** Three or four circles 240x240 placed on a ring centred at (960, 520) with radius 300 (e.g. top, right, bottom, left). Curved arrows (`bend` 60) between neighbours. A `loop` icon in the centre (110x110) and the goal box on the far left.
4. **Chart and callout.** Chart x 140, y 230, w 1000, h 580. Callout box x 1240, y 300, w 560, h 260, yellow, with the takeaway in words. An arrow from the callout to the important bar and a `highlight` circle on that bar. Source caption under the chart.
5. **Cross-section (nested).** Concentric circles centred at (560, 540): 600, 360 and 120 px wide. Labels as text on the right at x 1000, y 230 / 400 / 570, each with an arrow from the label back to its ring.
6. **Timeline.** A line from [140, 520] to [1780, 520]. Four small circles 60x60 on the line at x 260, 700, 1140, 1580. Years above (text at y 410) and events below (text at y 580, w 360).

Rule of thumb: every scene should cover at least a third of the frame and have 4-9 non-text elements. Validation warns (`sparse scene`, `few visual elements`) when it doesn't.

## Timing model

- Narration is split into sentences at `.`, `!`, `?`. Scene length comes from the voice audio, or from the silent estimate.
- By default every element is fully drawn by 65% of the scene (8 s before the end on long scenes), in `drawOrder`. The rest of the scene shows the finished picture while the narration ends.
- `cue: n` starts an element when sentence n (0-based) begins. Use it to sync a reveal to a sentence.
- `dur: 0.6` makes one element snap in quickly. `"drawBy": 0.8` at the storyboard root slows every scene down.

## Length

- Silent mode estimates English at about 2.6 words per second and Korean at about 6.5 syllables per second, plus 0.2 s per scene.
- A 40-second English video is about 100 words of narration in total: 6 scenes of about 16 words, two short sentences each. A 40-second Korean video is about 250 syllables.
- Real voices vary; build once with the voice you will use and adjust.

## Which warnings are fine

- `overlap` between a highlight and its target, nested circles, or a label you placed inside a box on purpose: fine after you look at the frame.
- `sparse scene` / `few visual elements`: fix them unless the emptiness is the point (a one-word title card).
- Errors (out of frame, caption zone, small font, mid-word caption, static over 10 s) block the render and must be fixed.
