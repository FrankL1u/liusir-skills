# Client Configuration Template

Use the following structure when creating `clients/{client}/style.yaml`.

```yaml
name: "Client Name"
industry: "Industry"
target_audience: "Audience description"

topics:
  - Topic 1
  - Topic 2

tone: "direct, useful, and grounded"
voice: "fast explanation from someone who knows the work closely"
word_count: "450-900"
content_style: "note / breakdown / opinion / mixed"

blacklist:
  words: [empty phrase, vague phrase]
  topics: [excluded topic]

reference_accounts: [reference_a, reference_b]

preset: "editorial"
style: "contrast-poster"  # optional override
layout: "balanced"        # optional override

author: "Author"
```

## Directory structure

```text
clients/{client}/
├── style.yaml
├── history.yaml
├── playbook.md
├── corpus/
├── lessons/
└── styles/
```

## Field guidance

- `topics`: recurring subject areas worth prioritizing
- `tone`: writing feel
- `voice`: how the copy should sound
- `word_count`: preferred draft density
- `blacklist.words`: phrases to avoid
- `blacklist.topics`: unwanted directions
- `preset`: default visual scheme
- `style`, `layout`: optional override settings

## Maintenance guidance

- update tone and blacklist when edits repeat the same complaints
- update defaults only when new output is consistently better
- keep the template lean enough to fill quickly
