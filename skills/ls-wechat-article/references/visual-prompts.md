# Visual AI Guide

> Rules for cover images, in-article illustrations, and AI image generation prompts.
> All images serve the article — they are not decoration. Every image must earn its place.

---

## Cover Image Design

## Image Intake Before Generation

Do not generate images silently.

First read `{runtime_root}/clients/{client}/style.yaml`.

- If `visuals` exists, use it without asking.
- If `visuals` is missing, ask for the complete first-run visual configuration, then write `visuals`.
- Every first-run field may be skipped. If skipped or unset, use the default from `references/visual-prompt-system.md`.
- If the user changes visual settings for the current run, ask whether to save the changed `visuals` for next time.

Use `references/visual-prompt-system.md` for machine-readable options, defaults, prompt templates, and generation constraints.

Recommended image-scope options:

- `cover+inline`
- `cover-only`
- `inline-only`
- `none`

Recommended style options:

- `follow article tone`
- `editorial` / `杂志信息图风`
- `blueprint` / `技术蓝图风`
- `notion` / `极简手绘线条风`
- `warm` / `温暖亲和风`
- `watercolor` / `水彩柔和风`
- `scientific` / `学术精确图表风`
- `lofi-doodle` / `低保真手绘涂鸦风`
- `multi-panel-manga` / `多格漫画说明风`
- `notebook-sketch` / `笔记本草图概念风`
- `claymation` / `黏土定格玩具风`

Recommended first-run detail options:

- Palette: `default`, `macaron`, `mono-ink`, `neon`, `warm`
- Cover type: `typography`, `hero`, `conceptual`, `metaphor`, `scene`, `minimal`
- Cover mood: `balanced`, `subtle`, `bold`
- Cover font: `clean`, `handwritten`, `serif`, `display`
- Cover text level: `title-only`, `none`, `title-subtitle`, `text-rich`
- Cover aspect: `2.35:1`
- Inline density: `balanced`, `minimal`, `per-section`, `rich`, `none`
- Inline type default: `auto`, `infographic`, `scene`, `flowchart`, `comparison`, `framework`, `timeline`

Defaulting rules:

- Default `cover.type`: `typography`
- Default `cover.text_level`: `title-only`
- Default `inline.density`: `balanced` (`3-5` images)
- Default `inline.type_default`: `auto`
- In first-run configuration, ask for all visual fields. Use defaults only when the user skips or leaves a field unset.
- In later runs, do not ask again when `style.yaml.visuals` already exists.

Before calling the toolkit:

- pass the configured cover type and text level to Step 5 cover generation
- choose the exact inline positions that deserve inline images
- prefer paragraph/content-block anchors; use section headings only as fallback
- choose one `inline type` for each chosen position

The toolkit may read the selected target content to build prompts, but it must not decide which positions to illustrate or which image types to use.

### Cover Technical Specs
- Aspect ratio: **2.35:1** (WeChat requirement)
- Resolution: **900×383** minimum, **1280×544** recommended
- Thumbnail crop: the center square (1:1) is used as thumbnail — ensure key visual elements are centered
- File size: < 5MB
- Format: PNG or JPG (avoid WebP — inconsistent device support)

---

## In-Article Image Strategy

### Which Paragraphs Need Images?

| Paragraph Type | Needs Image? | Why |
|---------------|-------------|-----|
| Data/evidence paragraph | YES | Visualize the data. Readers remember charts. |
| Scene/narrative paragraph | YES | Give the reader the picture they're imagining. |
| Turning point/climax | YES | Amplify emotional impact. |
| Pure opinion paragraph | NO | Let the words do the work. Images dilute opinion. |
| Opening paragraph | NO | Don't interrupt the hook. |
| CTA/closing paragraph | NO | Keep focus on the action. |
| Transition paragraphs | NO | These are bridges, not destinations. |

### Placement Rules

| Rule | Specification |
|------|-------------|
| Total count | 3-6 images per article |
| Minimum spacing | ≥300 characters between images |
| Optimal rhythm | One image per 3 screens of text (~600 characters) |
| Forbidden zones | Never in opening paragraph. Never in CTA/closing. |
| Format | 16:9 landscape for all in-article images |

### Image Prompt Engineering

**Mandatory elements in every prompt:**

1. **Aspect ratio:** "16:9 aspect ratio" (in-article) or "2.35:1 aspect ratio" (cover)
2. **No text directive:** "no text, no letters, no words, no characters, no writing, no captions"
3. **Style keywords:** Minimum 3 style descriptors that match article tone
4. **Color alignment:** Match the article's theme color family
5. **Concrete scene:** Describe specific visual elements — NOT abstract concepts

**Good prompt:**
> "A person sitting at a desk late at night, illuminated by the blue glow of a laptop screen, empty coffee cups beside them, city lights visible through the window behind, warm and cool light contrast, cinematic, 16:9 aspect ratio, no text no letters no words"

**Bad prompt:**
> "A picture representing productivity and hard work, modern style" (too abstract, no visual specificity)

### Style Consistency

All images within one article must share:
- **Color temperature:** Either all warm OR all cool (matching theme color)
- **Art style:** Either all photographic OR all illustrated — never mix
- **Complexity level:** Either all minimal OR all detailed — never mix
- **Lighting mood:** Consistent across the set

### Negative Prompt Patterns

Always include in prompts when relevant:
- `no text, no letters, no words, no watermark, no logo`
- `no blurry, no low quality, no distorted`
- `no cluttered background` (for clean compositions)
- `no people` (when human figures aren't needed — simpler compositions are more versatile)

---

## Color-to-Mood Mapping

Use this when deciding image color temperature:

| Article Tone | Image Color Direction |
|-------------|----------------------|
| Serious / analytical | Cool blues, grays, muted tones |
| Warm / personal / story | Warm ambers, soft oranges, golden light |
| Energetic / marketing | Vibrant, high saturation, bold contrast |
| Elegant / premium | Low saturation, deep tones, subtle gradients |
| Tech / futuristic | Cyan, electric blue, dark backgrounds with light accents |

---

## Mobile-First Composition

WeChat articles are read on phones (90%+ of readers). Design for mobile:

- **Simplify:** Fewer visual elements. Complex compositions become muddy on small screens.
- **High contrast:** Ensure key elements are distinguishable at phone resolution.
- **Center the subject:** Phone screens are narrow — edge details get lost.
- **Large focal point:** One dominant element, not a busy scene.
- **Test mentally:** "Would this image make sense as a phone wallpaper-sized rectangle?"

---

## Gotchas

**"The generic stock photo":** If the image could illustrate ANY article on the topic, it's too generic. The image should reflect something specific from YOUR article.

**"The text-in-image trap":** AI image generators often produce garbled text. ALWAYS include "no text, no letters, no words" in prompts. If you need text on an image, add it in post-processing.

**"The style mismatch":** A hyperrealistic photo next to a flat-design illustration breaks visual coherence. Pick one style per article and stick with it.

**"Over-illustration":** More images ≠ better article. If the article is 1500 words, 3 images is plenty. 6 images in a short article feels like a slideshow, not an article.

**"The unsized image":** Images that don't match the expected dimensions will be cropped or distorted by WeChat. Always specify the exact aspect ratio in the prompt.
