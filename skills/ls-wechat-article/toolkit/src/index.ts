/**
 * LS WeChat Toolkit - Public API
 */

export { WeChatConverter, previewHtml, type ConvertResult, type ConverterOptions } from './converter.js';
export { resolveArticleMetadata, stripPrimaryTitle, type ArticleMetadata } from './article-metadata.js';
export {
  generateTheme,
  listThemes,
  listPresetColors,
  PRESET_COLORS,
  PRESET_COLOR_LIST,
  DEFAULT_COLOR,
  DEFAULT_THEME,
  type Theme,
  type ThemeKey,
  type ThemeStyles,
  type ThemeOptions,
  type HeadingSize,
  type ParagraphSpacing,
  type FontFamily,
} from './theme-engine.js';
export { createDraft, type DraftResult, type CreateDraftOptions } from './publisher.js';
export { getAccessToken, uploadImage, uploadThumb } from './wechat-api.js';
export {
  generateGemini, generateOpenAI, generateDoubao, generateQwen,
  searchNanoBanana, selectFallbackCover, resolveProvider,
  generateImageToFile, GENERATORS, SIZE_MAP,
} from './image-gen.js';
export { illustrateMarkdown, type IllustrateOptions, type IllustrateResult } from './illustration-workflow.js';
export {
  runStyleBenchmark,
  parseBenchmarkStyles,
  parseBenchmarkArticleTypes,
  type StyleBenchmarkOptions,
  type StyleBenchmarkResult,
  type BenchmarkStyleKey,
  type BenchmarkArticleTypeKey,
} from './style-benchmark.js';
export { analyzeDiff, type DiffAnalysis } from './learn-edits.js';
export { latexToSvg, convertMathToHtml, processMathInHtml } from './math-processor.js';
export { renderMermaidToPng, processMermaidBlocks, isMermaidAvailable } from './mermaid-processor.js';
export { enhanceCodeBlocks } from './code-block-processor.js';
