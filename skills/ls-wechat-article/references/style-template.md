# Client Configuration Template

Copy the packaged example `clients/demo/style.yaml` into your runtime root when onboarding a new client.

```yaml
name: "Client Name"
industry: "Industry / vertical"
target_audience: "Specific audience persona"

topics:
  - Core topic 1
  - Core topic 2

tone: "专业但不学术，有观点但不端着"
voice: "像一个熟悉行业的朋友在分享"
word_count: "1500-2500"
content_style: "干货 / 故事 / 观点 / 混合"

blacklist:
  words: [空话, 套话]
  topics: [不写的话题]

theme: "wechat-tech"

visuals:
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
author: "Author name"
```

The shared visual prompt system is defined in `references/visual-prompt-system.md`.
Client `style.yaml` should only set the default public theme plus client-specific writing and image overrides.

## Directory structure

```text
{runtime_root}/clients/{client}/
├── style.yaml
├── history.yaml
├── playbook.md
├── corpus/
├── lessons/
└── themes/
```

`history.yaml` stores publish records and stats. `playbook.md` captures writing patterns. `corpus/` and `lessons/` feed future refinement.
