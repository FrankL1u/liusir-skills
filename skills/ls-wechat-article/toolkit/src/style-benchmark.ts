import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateImageToFile, type ImageGenResult } from './image-gen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = new URL('.', import.meta.url).pathname;
const PROJECT_DIR = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export type BenchmarkStyleKey =
  | 'notion'
  | 'elegant'
  | 'warm'
  | 'minimal'
  | 'blueprint'
  | 'watercolor'
  | 'editorial'
  | 'scientific'
  | 'lofi-doodle'
  | 'multi-panel-manga'
  | 'notebook-sketch'
  | 'claymation';

export type BenchmarkArticleTypeKey =
  | 'trend-judgment'
  | 'methodology-framework'
  | 'tool-review'
  | 'personal-narrative';

interface StylePreset {
  key: BenchmarkStyleKey;
  name: string;
  description: string;
  sharedDirection: string;
  coverDirection: string;
  inlineDirection: string;
}

interface ArticleFixture {
  key: BenchmarkArticleTypeKey;
  name: string;
  title: string;
  thesis: string;
  coverGoal: string;
  inlineHeading: string;
  inlinePurpose: string;
  inlineSummary: string;
}

interface BenchmarkAssetResult {
  status: 'ok' | 'prompt_only' | 'no_match' | 'failed';
  file?: string;
  promptFile: string;
  prompt: string;
  source?: string;
  message?: string;
}

interface BenchmarkCellResult {
  style: BenchmarkStyleKey;
  articleType: BenchmarkArticleTypeKey;
  cover: BenchmarkAssetResult;
  inline: BenchmarkAssetResult;
}

export interface StyleBenchmarkOptions {
  provider?: string;
  outputDir?: string;
  styles?: BenchmarkStyleKey[];
  articleTypes?: BenchmarkArticleTypeKey[];
  continueOnError?: boolean;
  color?: string;
  skipSummary?: boolean;
  skipExisting?: boolean;
  summaryOnly?: boolean;
}

export interface StyleBenchmarkResult {
  outputDir: string;
  overviewPath: string;
  scoresPath: string;
  matrixPath: string;
  styles: BenchmarkStyleKey[];
  articleTypes: BenchmarkArticleTypeKey[];
  cells: BenchmarkCellResult[];
}

const STYLE_PRESETS: Record<BenchmarkStyleKey, StylePreset> = {
  notion: {
    key: 'notion',
    name: '极简手绘线条风',
    description: '像知识卡片和 SaaS 说明图，克制、清爽、极简。',
    sharedDirection: 'minimal hand-drawn notes, clean white background, thin lines, knowledge-sharing visual language',
    coverDirection: 'single hero concept with clean labels, startup knowledge card aesthetic, polished but simple',
    inlineDirection: 'section explanation visual, hand-drawn knowledge card, clear structure, light annotation',
  },
  elegant: {
    key: 'elegant',
    name: '精致优雅风',
    description: '更成熟的商业视觉，秩序感强，适合思想领导力内容。',
    sharedDirection: 'refined editorial composition, elegant spacing, premium presentation, tasteful restrained colors',
    coverDirection: 'premium article cover with strong focal point, polished composition, thought-leadership mood',
    inlineDirection: 'refined conceptual illustration, structured and graceful, premium magazine explainer feel',
  },
  warm: {
    key: 'warm',
    name: '温暖亲和风',
    description: '柔和、友好、有人味，适合故事和轻解释。',
    sharedDirection: 'warm friendly visual style, soft edges, approachable composition, gentle and welcoming, symbolic or stylized subjects',
    coverDirection: 'friendly cover visual with emotional warmth and clear message, inviting and personal',
    inlineDirection: 'warm section illustration, gentle explanatory visual, relatable and easy to understand',
  },
  minimal: {
    key: 'minimal',
    name: '极简禅意风',
    description: '留白多，元素少，强调概念和秩序。',
    sharedDirection: 'minimalist composition, generous whitespace, only essential elements, calm restrained visual tone',
    coverDirection: 'minimal cover with one dominant concept and lots of space, highly distilled visual metaphor',
    inlineDirection: 'highly distilled section visual, sparse elements, clear hierarchy, calm explanatory drawing',
  },
  blueprint: {
    key: 'blueprint',
    name: '技术蓝图风',
    description: '工程、系统、结构感强，像架构图和蓝图草图。',
    sharedDirection: 'technical blueprint aesthetic, structural lines, system diagram feeling, engineering clarity',
    coverDirection: 'architectural technical cover, bold structural metaphor, system design visual language',
    inlineDirection: 'technical section diagram, blueprint lines, architecture explanation, system relationships',
  },
  watercolor: {
    key: 'watercolor',
    name: '水彩柔和风',
    description: '柔和艺术感，更自然、更有人情味。',
    sharedDirection: 'watercolor illustration, soft pigment diffusion, organic shapes, artistic and warm',
    coverDirection: 'watercolor article cover, soft emotional focal point, artistic storytelling composition',
    inlineDirection: 'watercolor explanatory illustration, gentle educational tone, organic conceptual rendering',
  },
  editorial: {
    key: 'editorial',
    name: '杂志信息图风',
    description: '编辑式概念图、结构图、科技解说图。',
    sharedDirection: 'editorial diagram style, off-white paper background, black outlines, teal and orange accents, structured explanatory visual',
    coverDirection: 'editorial magazine-style cover diagram, one strong framework metaphor, sharp explanatory composition',
    inlineDirection: 'editorial section diagram, concept visualization, relationship map, structured explainer graphic',
  },
  scientific: {
    key: 'scientific',
    name: '学术精确图表风',
    description: '更严谨、图表化、示意图化。',
    sharedDirection: 'scientific diagram aesthetic, precise labels, measured structure, educational chart-like rendering',
    coverDirection: 'scientific conceptual cover, precise schematic metaphor, analytical and rigorous tone',
    inlineDirection: 'precise explanatory diagram, chart-like structure, rigorous educational visual',
  },
  'lofi-doodle': {
    key: 'lofi-doodle',
    name: '低保真手绘涂鸦风',
    description: '像白板和草图本里的概念速写，随手但有亲和力。',
    sharedDirection: 'lofi doodle style, black sketch lines, rough paper texture, whiteboard thinking, casual ideation energy',
    coverDirection: 'single-page doodle cover, clear title area, rough sketch concept, playful explanatory vibe',
    inlineDirection: 'rough doodle explainer, simple symbols and arrows, brainstorming note feeling',
  },
  'multi-panel-manga': {
    key: 'multi-panel-manga',
    name: '多格漫画说明风',
    description: '多分镜、人物、拟声词和过程推进，适合教程与叙事。',
    sharedDirection: 'multi-panel manga explainer, black and white comic screentones, expressive stylized manga characters, narrative progression',
    coverDirection: 'manga-style cover poster with a strong main scene, comic energy, title integrated into the composition',
    inlineDirection: 'four-panel or multi-panel explanatory manga, process storytelling, clear action progression',
  },
  'notebook-sketch': {
    key: 'notebook-sketch',
    name: '笔记本草图概念风',
    description: '纸面草图、机械感、概念速写感强。',
    sharedDirection: 'notebook sketch concept art, rough pen lines, notebook paper texture, invention sketch feel',
    coverDirection: 'notebook-style conceptual cover drawing, bold hand-drawn mechanical metaphor, sketchbook energy',
    inlineDirection: 'notebook concept sketch for a section, rough system drawing, handwritten-study vibe',
  },
  claymation: {
    key: 'claymation',
    name: '黏土定格玩具风',
    description: '立体玩具感、软圆质感、色彩活泼。',
    sharedDirection: 'claymation stop-motion style, tactile clay texture, playful miniatures, rounded forms, vivid handmade world',
    coverDirection: 'claymation cover tableau, one central playful metaphor, tactile toy-like environment',
    inlineDirection: 'claymation explainer scene, miniature props and stylized toy-like characters, friendly tangible storytelling',
  },
};

const ARTICLE_FIXTURES: Record<BenchmarkArticleTypeKey, ArticleFixture> = {
  'trend-judgment': {
    key: 'trend-judgment',
    name: '趋势判断',
    title: 'AI 会写代码之后，最值钱的能力变了',
    thesis: '真正稀缺的能力从写代码，转向定义问题、组织工作流、推动验证闭环。',
    coverGoal: '表达“AI 改写的不只是写代码，而是整个构建和验证流程”的核心判断。',
    inlineHeading: '真正变贵的是工作流组织能力',
    inlinePurpose: '说明传统开发链路与 AI 协同链路的能力重心变化。',
    inlineSummary: '把“写代码”与“定义问题、任务拆解、验证反馈、持续迭代”之间的角色变化可视化。',
  },
  'methodology-framework': {
    key: 'methodology-framework',
    name: '方法论框架',
    title: '一个人公司如何搭建 AI Agent 执行系统',
    thesis: '一人公司最需要的不是更多工具，而是一个可复用、可追踪、可持续的 Agent 执行系统。',
    coverGoal: '表达“一人公司把多个 AI 能力模块组织成系统”的方法论主视觉。',
    inlineHeading: 'Agent 执行系统的四层结构',
    inlinePurpose: '展示采集、判断、执行、反馈四层如何形成闭环。',
    inlineSummary: '把一人公司中的 AI Agent 系统拆成采集层、判断层、执行层、反馈层，并说明它们的连接关系。',
  },
  'tool-review': {
    key: 'tool-review',
    name: '工具评测',
    title: 'Claude Code、Codex、Cursor：开发者到底该怎么选',
    thesis: '真正重要的不是谁更聪明，而是谁更适合你的工作流入口和验证方式。',
    coverGoal: '表达“多个 AI 编程工具围绕同一开发工作台展开竞争”的评测主视觉。',
    inlineHeading: '三类 AI 编程工具的差异',
    inlinePurpose: '可视化比较三类工具在入口、强项和适用场景上的差别。',
    inlineSummary: '并排展示不同 AI 编程工具在命令行、编辑器、代理执行三个入口上的能力差异和适用对象。',
  },
  'personal-narrative': {
    key: 'personal-narrative',
    name: '个人叙事',
    title: '我怎么把一个想法，在 7 天内做成能收费的产品',
    thesis: '真正拉开差距的不是执行更久，而是更快进入验证循环，让产品在真实反馈中成形。',
    coverGoal: '表达“个人从灵感出发，走向可收费产品”的叙事主视觉。',
    inlineHeading: '从想法到收费产品的 7 天流程',
    inlinePurpose: '展示个人从灵感、搭建、发布到收费的推进路径。',
    inlineSummary: '以个人叙事视角展示从想法、搭建 MVP、对外发布、获取首批付费反馈的连续过程。',
  },
};

function currentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseCsvList<T extends string>(value: string | undefined, allowed: readonly T[]): T[] {
  if (!value) return [...allowed];
  const requested = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean) as T[];
  const invalid = requested.filter(item => !allowed.includes(item));
  if (invalid.length) {
    throw new Error(`Unknown values: ${invalid.join(', ')}`);
  }
  return requested;
}

function buildOutputRoot(explicit?: string): string {
  if (explicit) return resolve(explicit);
  return resolve(PROJECT_DIR, 'output', 'style-benchmark', currentDateString());
}

function buildPromptBase(style: StylePreset, article: ArticleFixture): string {
  return [
    `Style benchmark visual for article type "${article.name}"`,
    `article title: "${article.title}"`,
    `core thesis: ${article.thesis}`,
    `visual style family: ${style.name}`,
    `style description: ${style.description}`,
    `shared direction: ${style.sharedDirection}`,
    'Chinese article illustration benchmark',
    'allow Chinese text when composition requires labels or title',
    'avoid realistic human figures, photorealistic faces, lifelike hands, or real-person portrait composition',
    'stylized symbols, icons, abstract forms, cartoon characters, manga figures, clay figures, and toy-like miniatures are allowed only when the chosen style strongly requires them',
    'no watermark, no logo',
    'publication-ready composition',
  ].join(', ');
}

function buildCoverPrompt(style: StylePreset, article: ArticleFixture): string {
  return [
    buildPromptBase(style, article),
    'image role: article cover',
    `cover goal: ${article.coverGoal}`,
    `cover direction: ${style.coverDirection}`,
    'wide hero composition, strong first-glance impact, headline-friendly layout',
  ].join(', ');
}

function buildInlinePrompt(style: StylePreset, article: ArticleFixture): string {
  return [
    buildPromptBase(style, article),
    'image role: inline article illustration',
    `section title: ${article.inlineHeading}`,
    `section purpose: ${article.inlinePurpose}`,
    `section summary: ${article.inlineSummary}`,
    `inline direction: ${style.inlineDirection}`,
    'clear explanatory visual, optimized for reading inside a WeChat article body',
  ].join(', ');
}

async function generateAsset(
  prompt: string,
  promptFile: string,
  outputFile: string,
  provider: string | undefined,
  color: string,
  size: 'cover' | 'article',
  skipExisting = false,
): Promise<BenchmarkAssetResult> {
  writeFileSync(promptFile, `${prompt}\n`, 'utf-8');
  if (skipExisting && existsSync(outputFile)) {
    return {
      status: 'ok',
      file: outputFile,
      promptFile,
      prompt,
      source: 'existing-file',
    };
  }
  try {
    const result = await generateImageToFile({
      prompt,
      output: outputFile,
      size,
      provider,
      fallbackCover: false,
      color,
      mood: '',
    });
    return {
      status: result.status,
      file: result.file,
      promptFile,
      prompt,
      source: result.source,
      message: result.message,
    };
  } catch (error) {
    return {
      status: 'failed',
      promptFile,
      prompt,
      message: String(error),
    };
  }
}

function summarizeExistingAsset(
  outputFile: string,
  promptFile: string,
  fallbackPrompt: string,
): BenchmarkAssetResult {
  const fileExists = existsSync(outputFile);
  const prompt = existsSync(promptFile) ? readFileSync(promptFile, 'utf-8').trim() : fallbackPrompt;
  return {
    status: fileExists ? 'ok' : 'failed',
    file: fileExists ? outputFile : undefined,
    promptFile,
    prompt,
    source: fileExists ? 'existing-file' : undefined,
    message: fileExists ? undefined : 'image not generated',
  };
}

function buildOverviewHtml(rootDir: string, cells: BenchmarkCellResult[], styles: BenchmarkStyleKey[], articleTypes: BenchmarkArticleTypeKey[]): string {
  const header = articleTypes
    .map(articleType => {
      const fixture = ARTICLE_FIXTURES[articleType];
      return `<th>${fixture.name}<br><small>${fixture.title}</small></th>`;
    })
    .join('');

  const rows = styles
    .map(styleKey => {
      const style = STYLE_PRESETS[styleKey];
      const tds = articleTypes
        .map(articleType => {
          const cell = cells.find(item => item.style === styleKey && item.articleType === articleType);
          if (!cell) return '<td class="missing">Missing</td>';

          const coverSrc = cell.cover.file ? relative(rootDir, cell.cover.file).replace(/\\/g, '/') : '';
          const inlineSrc = cell.inline.file ? relative(rootDir, cell.inline.file).replace(/\\/g, '/') : '';
          const coverPrompt = relative(rootDir, cell.cover.promptFile).replace(/\\/g, '/');
          const inlinePrompt = relative(rootDir, cell.inline.promptFile).replace(/\\/g, '/');

          return `
            <td>
              <div class="cell">
                <div class="asset">
                  <div class="label">封面</div>
                  ${coverSrc ? `<img src="${coverSrc}" alt="${style.name} ${ARTICLE_FIXTURES[articleType].name} cover">` : `<div class="error">${cell.cover.status}: ${cell.cover.message ?? ''}</div>`}
                  <div class="meta"><a href="${coverPrompt}">prompt</a></div>
                </div>
                <div class="asset">
                  <div class="label">正文图</div>
                  ${inlineSrc ? `<img src="${inlineSrc}" alt="${style.name} ${ARTICLE_FIXTURES[articleType].name} inline">` : `<div class="error">${cell.inline.status}: ${cell.inline.message ?? ''}</div>`}
                  <div class="meta"><a href="${inlinePrompt}">prompt</a></div>
                </div>
              </div>
            </td>
          `;
        })
        .join('');

      return `<tr><th>${style.name}<br><small>${style.key}</small></th>${tds}</tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Style Benchmark Overview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; background: #f7f7f5; color: #1f2937; }
    h1 { margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #d1d5db; vertical-align: top; background: #fff; padding: 8px; }
    th { background: #f3f4f6; font-weight: 700; }
    th small { font-weight: 400; color: #6b7280; }
    .cell { display: grid; gap: 12px; }
    .asset { display: grid; gap: 6px; }
    .asset img { width: 100%; display: block; border-radius: 6px; background: #fafafa; }
    .label { font-size: 12px; font-weight: 700; color: #111827; }
    .meta, .meta a { font-size: 12px; color: #2563eb; }
    .error { font-size: 12px; color: #b91c1c; white-space: pre-wrap; }
    .missing { color: #9ca3af; }
  </style>
</head>
<body>
  <h1>风格 Benchmark 总览</h1>
  <p>每个单元格展示同一风格下的封面图与正文图，横向比较文章类型，纵向比较风格系统。</p>
  <table>
    <thead>
      <tr>
        <th>风格 \\ 类型</th>
        ${header}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

function buildScoresMarkdown(cells: BenchmarkCellResult[], styles: BenchmarkStyleKey[], articleTypes: BenchmarkArticleTypeKey[]): string {
  const sections = styles.map(styleKey => {
    const style = STYLE_PRESETS[styleKey];
    const rows = articleTypes
      .map(articleType => {
        const article = ARTICLE_FIXTURES[articleType];
        const cell = cells.find(item => item.style === styleKey && item.articleType === articleType);
        return [
          `## ${style.name} / ${article.name}`,
          '',
          `- 风格 key：\`${style.key}\``,
          `- 文章类型：\`${article.key}\``,
          `- 封面状态：${cell?.cover.status ?? 'missing'}`,
          `- 正文图状态：${cell?.inline.status ?? 'missing'}`,
          '- 风格辨识度：',
          '- 封面抓眼程度：',
          '- 正文图解释力：',
          '- 封面与正文一致性：',
          '- 中文图内文字可用性：',
          '- 是否适合公众号：',
          '- 是否适合作为默认风格：',
          '- 备注：',
          '',
        ].join('\n');
      })
      .join('\n');
    return rows;
  });

  return [
    '# 风格 Benchmark 评分模板',
    '',
    '请逐项填写每个“风格 × 文章类型”组合的主观评估结果。',
    '',
    ...sections,
  ].join('\n');
}

export function parseBenchmarkStyles(value?: string): BenchmarkStyleKey[] {
  return parseCsvList(value, Object.keys(STYLE_PRESETS) as BenchmarkStyleKey[]);
}

export function parseBenchmarkArticleTypes(value?: string): BenchmarkArticleTypeKey[] {
  return parseCsvList(value, Object.keys(ARTICLE_FIXTURES) as BenchmarkArticleTypeKey[]);
}

export async function runStyleBenchmark(opts: StyleBenchmarkOptions = {}): Promise<StyleBenchmarkResult> {
  const styles = opts.styles ?? (Object.keys(STYLE_PRESETS) as BenchmarkStyleKey[]);
  const articleTypes = opts.articleTypes ?? (Object.keys(ARTICLE_FIXTURES) as BenchmarkArticleTypeKey[]);
  const rootDir = buildOutputRoot(opts.outputDir);
  const promptsRoot = join(rootDir, 'prompts');
  const imagesRoot = join(rootDir, 'images');
  mkdirSync(promptsRoot, { recursive: true });
  mkdirSync(imagesRoot, { recursive: true });

  const cells: BenchmarkCellResult[] = [];

  for (const styleKey of styles) {
    const style = STYLE_PRESETS[styleKey];
    for (const articleTypeKey of articleTypes) {
      const article = ARTICLE_FIXTURES[articleTypeKey];
      const promptDir = join(promptsRoot, style.key, article.key);
      const imageDir = join(imagesRoot, style.key, article.key);
      mkdirSync(promptDir, { recursive: true });
      mkdirSync(imageDir, { recursive: true });

      const coverPrompt = buildCoverPrompt(style, article);
      const inlinePrompt = buildInlinePrompt(style, article);
      const coverPromptFile = join(promptDir, 'cover.prompt.txt');
      const inlinePromptFile = join(promptDir, 'inline.prompt.txt');
      const coverOutput = join(imageDir, 'cover.png');
      const inlineOutput = join(imageDir, 'inline.png');

      const cover = opts.summaryOnly
        ? summarizeExistingAsset(coverOutput, coverPromptFile, coverPrompt)
        : await generateAsset(
            coverPrompt,
            coverPromptFile,
            coverOutput,
            opts.provider,
            opts.color ?? '#3498db',
            'cover',
            opts.skipExisting,
          );

      const inline = opts.summaryOnly
        ? summarizeExistingAsset(inlineOutput, inlinePromptFile, inlinePrompt)
        : await generateAsset(
            inlinePrompt,
            inlinePromptFile,
            inlineOutput,
            opts.provider,
            opts.color ?? '#3498db',
            'article',
            opts.skipExisting,
          );

      const cell: BenchmarkCellResult = {
        style: style.key,
        articleType: article.key,
        cover,
        inline,
      };
      cells.push(cell);

      const hasFailure =
        cover.status === 'failed' ||
        inline.status === 'failed' ||
        (!opts.continueOnError && (cover.status !== 'ok' || inline.status !== 'ok'));
      if (hasFailure && !opts.continueOnError) {
        throw new Error(`Benchmark generation failed for ${style.key}/${article.key}`);
      }
    }
  }

  const overviewPath = join(rootDir, 'overview.html');
  const scoresPath = join(rootDir, 'scores.md');
  const matrixPath = join(rootDir, 'matrix.json');

  if (!opts.skipSummary) {
    writeFileSync(overviewPath, buildOverviewHtml(rootDir, cells, styles, articleTypes), 'utf-8');
    writeFileSync(scoresPath, buildScoresMarkdown(cells, styles, articleTypes), 'utf-8');
    writeFileSync(
      matrixPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          rootDir,
          styles,
          articleTypes,
          cells,
        },
        null,
        2,
      ),
      'utf-8',
    );
  }

  return {
    outputDir: rootDir,
    overviewPath,
    scoresPath,
    matrixPath,
    styles,
    articleTypes,
    cells,
  };
}
