# XHS Note Workflow

独立的小红书图文笔记技能。当前主流程聚焦在正文生成与图片生成，后续导出和发布步骤暂时保留为空位。内容生成、标题判断、图片切片和 prompt 组装由文档规则与 agent 完成，CLI 只负责执行层动作。

## 能力概览

| 输入方式 | 输出结果 |
|----------|----------|
| 主题输入 | 先落 `source-article.md`，再提炼 `note.md`，最后生成图片 |
| 长文 Markdown 输入 | 基于现成长文提炼 `note.md`，再继续生成图片 |
| 现有草稿输入 | 直接优化 `note.md` 并生成图片 |

## 安装

> 环境要求：Node.js >= 18、Python >= 3.9

```bash
cd toolkit && npm install && npm run build && npm run validate-skill && cd ..
cp config.example.yaml config.yaml
pip install -r requirements.txt
```

## 常用命令

完整参数见 [cli-reference.md](./references/cli-reference.md)。

```bash
# 预览视觉解析
node dist/cli.js preview output/demo/2026-04-08-workflow-note/note.md --preset editorial

# 生成系列图
node dist/cli.js series output/demo/2026-04-08-workflow-note/series-plan.json --provider qwen --yes

# 风格辅助
node dist/cli.js styles
node dist/cli.js layouts
node dist/cli.js presets

# 图片生成
node dist/image-gen.js --prompt "contrast poster first page for workflow note" --output output/demo/series-page.png --provider qwen

```

## 当前产物

默认输出目录：

```text
output/{client}/{date}-{slug}/
```

当前会用到的核心文件包括：

- `source-article.md`
- `note.md`
- `series-outline.md`
- `series-plan.json`
- `series-manifest.json`
- `prompts/`
- `images/`

`series-manifest.json` 记录系列图生成状态。  
`series-plan.json` 和 `series-outline.md` 是 Step 5 的桥接产物。  
标题、hashtags、首屏文案、图片切片和 prompt 由 agent 按 `references/` 规则生成，不由 CLI 程序猜测。

后续导出和发布处理仍保留为空位，暂不作为主流程的一部分。

## 目录结构

```text
clients/demo/
├── style.yaml
├── history.yaml
└── styles/
```

客户端模板见 [style-template.md](./references/style-template.md)。  
系列图风格策略见 [style-selection.md](./references/style-selection.md) 与 [style-presets.md](./references/style-presets.md)。  
正文规则见 [writing-guide.md](./references/writing-guide.md) 与 [frameworks.md](./references/frameworks.md)。

## 相关文件

- [agents/openai.yaml](./agents/openai.yaml)
- [scripts/validate_skill.py](./scripts/validate_skill.py)
- [toolkit/src/cli.ts](./toolkit/src/cli.ts)
- [toolkit/src/image-gen.ts](./toolkit/src/image-gen.ts)

内部维护兼容文件：

- [toolkit/src/build-playbook.ts](./toolkit/src/build-playbook.ts)
- [toolkit/src/learn-edits.ts](./toolkit/src/learn-edits.ts)

## 许可证

MIT
