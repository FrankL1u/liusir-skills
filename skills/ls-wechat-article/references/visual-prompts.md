# Visual AI Guide

> Rules for cover images, in-article illustrations, and AI image generation prompts.
> All images serve the article — they are not decoration. Every image must earn its place.

---

## Cover Image Design

## Image Intake Before Generation

Do not generate images silently. First confirm both:

1. **Whether the user wants images at all**
2. **What style direction they want**
3. **How dense the inline images should be**

If the host supports `AskUserQuestion`, use it for a structured intake.
If not, ask a short plain-text question.

Recommended image-scope options:

- `cover + inline images`
- `cover only`
- `inline only`
- `no images`

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

Recommended inline density options:

- `minimal` — 少量重点图（1-2 张）
- `balanced` — 标准配图（3-5 张）
- `per-section` — 尽量每个强信息小节都配图
- `custom` — 用户自己指定数量

Defaulting rules:

- If the user wants visuals but gives no style, use `follow article tone`.
- If the user gives a style but not an image scope, ask once for scope before generating.
- If the user wants inline images but gives no density, use `balanced`.
- Never infer `no images` just because the user did not mention visuals.

After intake, convert the decision into explicit execution inputs before calling the toolkit:

- choose one `cover type`
- choose the exact section headings that deserve inline images
- choose one `inline type` for each chosen section

The toolkit may read the selected section content to build prompts, but it must not decide which sections to illustrate or which image types to use.

### 3 Creative Directions

Generate all three. Auto mode selects Creative A. If the workflow starts from an explicit `--step` that requires human choice, present all three and wait for selection.

**Creative A — Direct Impact**
- The most literal visual metaphor for the article's core concept
- Style: flat design, bold shapes, strong color contrast, geometric elements
- Best for: data articles, tool recommendations, method guides, technical content
- Prompt pattern: `[core concept as visual metaphor], flat design, bold [brand color] and white, geometric shapes, minimalist, clean background, no text no letters no words, 2.35:1 aspect ratio, leave space on left third for title overlay`

**Creative B — Atmospheric**
- Creates mood and emotional context for the article
- Style: soft gradients, cinematic lighting, warm/cool tones matched to article emotion
- Best for: story articles, opinion pieces, personal narratives, human-interest content
- Prompt pattern: `[scene that evokes the article's emotion], cinematic lighting, [warm/cool] color palette centered on [brand color], atmospheric, soft focus background, depth of field, no text no letters no words, 2.35:1 aspect ratio, leave space for title overlay`

**Creative C — Information Visual**
- Graphical representation of the core data, process, or structure
- Style: clean infographic aesthetic, icons, data visualization elements
- Best for: comparison articles, listicles, process guides, trend analysis
- Prompt pattern: `[abstract representation of data/process], infographic style, clean layout, [brand color] accent color, icons and geometric shapes, white background, professional, no text no letters no words, 2.35:1 aspect ratio, leave space for title overlay`

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
