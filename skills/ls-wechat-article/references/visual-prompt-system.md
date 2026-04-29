# Visual Prompt System

This file is the source of truth for image-generation fields, defaults, prompt templates, style descriptions, type descriptions, and generation constraints.

Code may parse the fenced YAML block below, but it must not duplicate this prompt content in TypeScript.

```yaml
defaults:
  scope: "cover+inline"
  style: "follow article tone"
  palette: "default"
  cover:
    type: "typography"
    mood: "balanced"
    font: "clean"
    text_level: "title-only"
    aspect: "2.35:1"
  inline:
    density: "balanced"
    type_default: "auto"

global:
  subject_constraints: "禁止写实人物、真实脸部、真实手部和真人肖像式构图。允许非写实角色，只在确有表达需要时使用，例如漫画人物、玩具化角色、图标化角色、黏土风角色。优先使用结构、符号、图标、模块、物体关系来表达观点，而不是人物表演。"
  visual_constraints: "同一篇文章只使用一个主视觉风格。封面图和正文图共享主风格、配色气质和复杂度。画面必须服务文章观点，不做泛泛装饰。"
  negative_prompt: "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，构图混乱，文字模糊，扭曲，水印，logo。"

templates:
  cover: |
    WeChat article cover image for "{{articleTitle}}",
    article summary: {{articleSummary}},
    cover image type: {{coverType}},
    cover type direction: {{coverTypeDirection}},
    mood: {{coverMood}},
    mood direction: {{coverMoodDirection}},
    font style: {{coverFont}},
    font direction: {{coverFontDirection}},
    text level: {{coverTextLevel}},
    text level direction: {{coverTextLevelDirection}},
    aspect ratio: {{coverAspect}},
    accent color family: {{color}},
    palette: {{paletteDirection}},
    visual style key: {{styleKey}},
    style direction: {{styleDirection}},
    cover style detail: {{coverStyleDirection}},
    {{subjectConstraints}},
    {{visualConstraints}},
    {{textRule}}
  inline: |
    Editorial illustration for a WeChat article titled "{{articleTitle}}",
    section focus: {{sectionHeading}},
    section summary: {{sectionSummary}},
    inline image type: {{inlineType}},
    type direction: {{inlineTypeDirection}},
    aspect ratio: 16:9,
    accent color family: {{color}},
    palette: {{paletteDirection}},
    visual style key: {{styleKey}},
    style direction: {{styleDirection}},
    inline style detail: {{inlineStyleDirection}},
    mobile-first composition,
    clean focal point,
    editorial quality,
    {{subjectConstraints}},
    {{visualConstraints}},
    allow Chinese labels only when the chosen style strongly requires them

palettes:
  - key: "default"
    zh: "跟随风格配色"
    direction: "Follow the selected style's default palette."
  - key: "macaron"
    zh: "马卡龙"
    direction: "Soft macaron pastel color blocks on warm cream. Use coral accents sparingly for emphasis."
  - key: "mono-ink"
    zh: "黑白墨线"
    direction: "Black ink on white canvas with sparse semantic accent colors under 10% of the canvas."
  - key: "neon"
    zh: "霓虹"
    direction: "Vibrant neon colors on a dark background, suitable for AI, future, tools, and technology themes."
  - key: "warm"
    zh: "暖调"
    direction: "Warm, soft, reading-friendly colors for narrative, opinion, and personal experience articles."

cover_types:
  - key: "hero"
    zh: "焦点视觉"
    direction: "Large focal visual with strong first-glance impact and one dominant subject."
  - key: "conceptual"
    zh: "概念解释"
    direction: "Use abstract shapes and visual systems to explain the article's core concept."
  - key: "typography"
    zh: "标题主导"
    direction: "Title-led poster composition where the article title is the primary visual element."
  - key: "metaphor"
    zh: "隐喻表达"
    direction: "Concrete objects or structures express the article argument symbolically."
  - key: "scene"
    zh: "场景氛围"
    direction: "A readable work, life, or narrative scene sets the article tone."
  - key: "minimal"
    zh: "极简留白"
    direction: "Single focal element, essential shapes only, and generous whitespace."

cover_moods:
  - key: "subtle"
    zh: "克制"
    direction: "Low contrast, muted saturation, light visual weight, calm refined energy."
  - key: "balanced"
    zh: "均衡"
    direction: "Medium contrast, natural saturation, clear but not aggressive."
  - key: "bold"
    zh: "强烈"
    direction: "High contrast, vivid saturation, heavy visual weight, dynamic attention-grabbing energy."

cover_fonts:
  - key: "clean"
    zh: "清爽现代"
    direction: "Clean geometric sans-serif typography with sharp edges and high readability."
  - key: "handwritten"
    zh: "手写亲和"
    direction: "Warm hand-lettered typography with organic strokes and approachable character."
  - key: "serif"
    zh: "优雅衬线"
    direction: "Elegant serif typography with editorial, authoritative character."
  - key: "display"
    zh: "醒目标题"
    direction: "Bold display typography with strong headline impact."

cover_text_levels:
  - key: "none"
    zh: "无文字"
    direction: "No visible title, subtitle, tags, labels, captions, or writing in the image."
  - key: "title-only"
    zh: "仅标题"
    direction: "Use the exact article title as the only visible text. Do not rewrite, shorten, translate, or invent title text."
  - key: "title-subtitle"
    zh: "标题+副标题"
    direction: "Use the exact article title plus a concise subtitle that clarifies the article context."
  - key: "text-rich"
    zh: "信息丰富"
    direction: "Use title, subtitle, and 2-4 short keyword tags with clear hierarchy."

cover_aspects:
  - key: "2.35:1"
    zh: "公众号封面"
    direction: "2.35:1 wide WeChat cover. Keep the main visual thumbnail-safe in the center square crop."

inline_types:
  - key: "infographic"
    zh: "数据图"
    direction: "Data-rich infographic with modular blocks, numbers, and clear information hierarchy."
  - key: "scene"
    zh: "场景图"
    direction: "Single explanatory scene that translates the paragraph into a readable visual moment."
  - key: "flowchart"
    zh: "流程图"
    direction: "Step-by-step workflow with arrows, sequence, transitions, and decision points."
  - key: "comparison"
    zh: "对比图"
    direction: "Side-by-side layout for before-after, option-option, or tradeoff comparison."
  - key: "framework"
    zh: "框架图"
    direction: "Conceptual framework diagram with system relationships, modules, layers, and mapped connections."
  - key: "timeline"
    zh: "时间线"
    direction: "Milestones or stages unfolding along a time axis."

inline_density:
  - key: "minimal"
    zh: "1-2 张"
    direction: "Keep only the most essential 1-2 illustration positions."
  - key: "balanced"
    zh: "3-5 张"
    direction: "Keep 3-5 images that cover the article's main sections."
  - key: "per-section"
    zh: "按章节"
    direction: "Plan at least one image for each major section when it has real visual value."
  - key: "rich"
    zh: "全文"
    direction: "Cover more high-value visual positions in long systematic articles."
  - key: "none"
    zh: "不生成正文图"
    direction: "Do not generate inline images."

styles:
  - key: "notion"
    zh: "极简手绘线条风"
    aliases: ["notion-like", "sketch notes", "极简手绘"]
    direction: "Minimal hand-drawn note card, clean white background, thin lines, knowledge-sharing visual language."
    cover_direction: "Single hero concept with clean labels, startup knowledge card aesthetic, polished but simple."
    inline_direction: "Section explanation visual, hand-drawn knowledge card, clear structure, light annotation."
  - key: "warm"
    zh: "温暖亲和风"
    aliases: ["warm friendly", "friendly warm", "温暖"]
    direction: "Warm friendly visual style, soft edges, approachable composition, gentle and welcoming, symbolic or stylized subjects."
    cover_direction: "Friendly cover visual with emotional warmth and clear message, inviting and personal."
    inline_direction: "Warm section illustration, gentle explanatory visual, relatable and easy to understand."
  - key: "blueprint"
    zh: "技术蓝图风"
    aliases: ["modern tech high contrast", "high contrast tech", "技术蓝图"]
    direction: "Technical blueprint aesthetic, structural lines, system diagram feeling, engineering clarity."
    cover_direction: "Architectural technical cover, bold structural metaphor, system design visual language."
    inline_direction: "Technical section diagram, blueprint lines, architecture explanation, system relationships."
  - key: "watercolor"
    zh: "水彩柔和风"
    aliases: ["soft watercolor", "水彩"]
    direction: "Watercolor illustration, soft pigment diffusion, organic shapes, artistic and warm."
    cover_direction: "Watercolor article cover, soft emotional focal point, artistic storytelling composition."
    inline_direction: "Watercolor explanatory illustration, gentle educational tone, organic conceptual rendering."
  - key: "editorial"
    zh: "杂志信息图风"
    aliases: ["clean editorial tech", "editorial tech", "杂志信息图"]
    direction: "Editorial diagram style, off-white paper background, black outlines, teal and orange accents, structured explanatory visual."
    cover_direction: "Editorial magazine-style cover diagram, one strong framework metaphor, sharp explanatory composition."
    inline_direction: "Editorial section diagram, concept visualization, relationship map, structured explainer graphic."
  - key: "scientific"
    zh: "学术精确图表风"
    aliases: ["scientific diagram", "precise chart", "学术精确"]
    direction: "Scientific diagram aesthetic, precise labels, measured structure, educational chart-like rendering."
    cover_direction: "Scientific conceptual cover, precise schematic metaphor, analytical and rigorous tone."
    inline_direction: "Precise explanatory diagram, chart-like structure, rigorous educational visual."
  - key: "lofi-doodle"
    zh: "低保真手绘涂鸦风"
    aliases: ["lofi doodle", "doodle", "扁平涂鸦风"]
    direction: "Lofi doodle style, black sketch lines, rough paper texture, whiteboard thinking, casual ideation energy."
    cover_direction: "Single-page doodle cover, rough sketch concept, playful explanatory vibe."
    inline_direction: "Rough doodle explainer, simple symbols and arrows, brainstorming note feeling."
  - key: "multi-panel-manga"
    zh: "多格漫画说明风"
    aliases: ["multi panel manga", "manga explainer", "多格漫画风"]
    direction: "Multi-panel manga explainer, black and white comic screentones, expressive stylized manga characters, narrative progression."
    cover_direction: "Manga-style cover poster with a strong main scene, comic energy, title integrated into the composition."
    inline_direction: "Four-panel or multi-panel explanatory manga, process storytelling, clear action progression."
  - key: "notebook-sketch"
    zh: "笔记本草图概念风"
    aliases: ["notebook sketch", "concept sketch", "手绘笔记风"]
    direction: "Notebook sketch concept art, rough pen lines, notebook paper texture, invention sketch feel."
    cover_direction: "Notebook-style conceptual cover drawing, bold hand-drawn mechanical metaphor, sketchbook energy."
    inline_direction: "Notebook concept sketch for a section, rough system drawing, handwritten-study vibe."
  - key: "claymation"
    zh: "黏土定格玩具风"
    aliases: ["clay", "stop motion clay", "活泼趣味风"]
    direction: "Claymation stop-motion style, tactile clay texture, playful miniatures, rounded forms, vivid handmade world."
    cover_direction: "Claymation cover tableau, one central playful metaphor, tactile toy-like environment."
    inline_direction: "Claymation explainer scene, miniature props and stylized toy-like characters, friendly tangible storytelling."
```
