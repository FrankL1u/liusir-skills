# WeChat SEO & Algorithm Optimization

> WeChat Search (搜一搜) uses the Peoplerank algorithm — ranking based on user satisfaction,
> not traditional link metrics. Understanding this system is critical for long-term traffic.
> This file covers both search SEO and the recommendation algorithm that drives feed traffic.

---

## WeChat Recommendation Algorithm (2025)

The algorithm determines how far your article travels beyond your subscriber base.

### Signal Weights

| Signal | Weight | What It Measures |
|--------|--------|-----------------|
| Open Rate (CTR) | ~40% | Title + topic relevance |
| Interaction Rate (likes/saves/在看) | ~30% | Content quality + engagement design |
| Share Rate | ~20% | Shareability + emotional resonance |
| Complete Read Rate | ~10% | Content quality + pacing (but feeds into quality scoring at 30% weight) |

### Traffic Pool Mechanics

1. **Cold start:** New article enters pool of ~500-1,000 impressions
2. **Phase 1 (0-24h):** Needs **>8% CTR** to advance to larger pool
3. **Growth phase:** Must maintain **completion rate >55%** AND **interaction rate >3%**
4. **Re-evaluation:** System re-evaluates allocation **every 15 minutes**
5. **Social multiplier:** One quality share can cascade through ~6 levels of social spreading

**Key insight:** Complete read rate alone doesn't drive recommendations. The four signals that matter most for distribution: **share count, like count, 在看 count, comment count.** Completion rate is the means to these ends.

---

## Title Optimization

Title accounts for approximately **70% of article success**. Users decide within 1-2 seconds.

### Core Principle

标题不是文章摘要，而是点击理由。

每个标题必须回答一个问题：

> 读者为什么要在 1-2 秒内点开这篇文章？

Do not write a title that only summarizes the topic. A usable WeChat title must trigger at least one reader motivation:

- 这和我有关
- 我想知道答案
- 这个观点和我想的不一样
- 这里藏了关键信息
- 点进去我能得到东西

### Hard Constraints
- **Length:** 20-28 Chinese characters. Titles truncate in notification pushes and reshares around character 25.
- **Core keyword:** Must appear in the **first half** of the title (first 12-14 characters).
- **Promise match:** The article body must deliver what the title promises.
- **Digest separation:** The digest must not repeat the title.
- **No cheap bait:** Avoid low-trust words such as `震惊`, `必看`, `速看`, `太炸了`, unless the client voice explicitly allows them and the article can justify the tone.

### Five Title Motivation Types

#### 1. 观点鲜明型

Use when the article is a judgment piece, trend interpretation, industry analysis, or opinion-driven essay.

Formula patterns:

```text
[对象/现象]，真正重要的不是 A，而是 B
[人群/行业]最该警惕的，不是 A，而是 B
[热点]之后，真正的门槛变成了 B
```

Examples:

```text
企业 Agent 真正缺的不是大模型，是底盘
OpenClaw 火了，但企业 Agent 缺的不是模型
Agent 落地最难的，不是智能，而是执行系统
```

Risk:

- The title becomes a slogan if the body does not prove the claim.
- Avoid abstract nouns stacked together without a concrete object.

#### 2. 好奇疑问型

Use when the article explains a phenomenon, unpacks a confusing signal, or answers a practical question.

Formula patterns:

```text
为什么 [常见现象] 会 [反常结果]？
[大家都在做的事]，到底是机会还是坑？
[热点] 之后，下一道坎是什么？
```

Examples:

```text
为什么 OpenClaw 火了，企业反而更难落地 Agent？
为什么模型越来越强，Agent 还是跑不进企业？
OpenClaw 之后，企业 Agent 的下一道坎是什么？
```

Risk:

- Do not ask a question the body cannot answer.
- Avoid empty curiosity, such as `你知道吗` without a specific tension.

#### 3. 认知反差型

Use when the article has a counterintuitive insight, challenges the default industry narrative, or reframes a familiar topic.

Formula patterns:

```text
越 [常见追求]，越容易 [反效果]
看似 A 的 [对象]，真正靠的是 B
[大家以为的答案]，反而暴露了 [真实问题]
```

Examples:

```text
越强的模型，越暴露企业 Agent 的短板
OpenClaw 越火，越说明 Agent 还没真正成熟
Agent 真正的差距，不在模型，而在谁能长记性
```

Risk:

- The contrast must be real. Do not manufacture contradiction for clicks.
- The opening must quickly show why the reversal is defensible.

#### 4. 悬念缺口型

Use when the article begins from a case, event, experiment, or personal observation and withholds the key lesson.

Formula patterns:

```text
[事件/结果]之后，我发现了一个更关键的问题
[具体动作]前，最好先弄清这件事
[热点]让大家兴奋，但真正的问题才刚开始
```

Examples:

```text
OpenClaw 爆火之后，真正的问题才刚开始
Karpathy 点赞 OpenClaw 后，我反而看到一个隐患
企业上 Agent 前，最好先看懂 OpenClaw 的短板
```

Risk:

- The hidden information must be specific and worth revealing.
- Do not hide the entire topic; readers still need to know what field the article is about.

#### 5. 痛点利益型

Use when the article is a method, tool guide, operational playbook, troubleshooting piece, or decision guide.

Formula patterns:

```text
[人群]不用再 [痛点]，用 [方法] 解决 [结果]
从 [起点] 到 [结果]，一篇讲清 [方法]
[人群]别急着 [动作]，先补齐 [关键能力]
```

Examples:

```text
企业做 Agent，不用先堆模型，先补这层底盘
想让 Agent 真正干活，先解决这 3 个问题
企业别急着上 Agent，先补齐执行系统
```

Risk:

- If the title promises a method, the article must contain an actual method.
- Avoid fake utility, such as `一文讲清` when the piece is only a viewpoint essay.

### Step 4 Title Generation Protocol

Before drafting the article body, generate and select the H1 title.

Required process:

1. Extract the article's core claim in one sentence.
2. Identify the target reader and the reader's likely concern.
3. Select 2-3 title motivation types from the five above.
4. Generate at least 5 title candidates.
5. Label each candidate with its motivation type.
6. Count title length and check whether the core keyword appears in the first half.
7. Score each candidate using the rubric below.
8. Pick one title as the H1 before drafting the body.
9. Draft the body around the chosen title's promise.

The title candidate table should use this shape:

| Candidate | Type | Length | Core keyword position | Score | Risk |
|-----------|------|--------|-----------------------|-------|------|
| ... | 观点鲜明 | 24 | 前 10 字 | 22/25 | 需要正文证明 B |

### Title Scoring Rubric

Score each candidate from 1-5 on each dimension:

| Dimension | 5 means | 1 means |
|-----------|---------|---------|
| 点击动机清晰度 | One clear reason to click is obvious | Reads like a neutral summary |
| 核心关键词前置 | Main keyword appears naturally in the first half | Main keyword is missing or buried |
| 具体性 | Names a concrete object, problem, result, or contrast | Uses broad terms like `趋势`, `机会`, `未来` only |
| 正文兑现度 | Body can fully deliver the promise | Promise is bigger than the article |
| 微信传播感 | Sounds native to WeChat feeds without being cheap | Sounds academic, vague, or like ad copy |

Selection rule:

- Prefer the highest total score only if the risk is manageable.
- If two candidates tie, choose the one that best matches the article's core claim.
- Do not choose a title whose promise requires facts, cases, or methods the article does not contain.

### Title QA Checklist

Use this checklist in Step 4.5:

- Does the title create a click reason, not just summarize the article?
- Which of the five motivation types does it use?
- Is the core keyword in the first half?
- Is the title 20-28 Chinese characters when possible?
- Does the article body deliver the title's promise?
- Does the digest add a new hook instead of repeating the title?
- Is the title cheap bait, exaggerated, or unsupported?
- Would a target reader immediately know why this article matters to them?

### Title Craft Details

Strategic punctuation in titles:
- `!` — urgency/emphasis (use sparingly, max 1)
- `?` — curiosity/doubt (strong for engagement)
- `......` — unfinished thought, suspense
- `「」` — highlight a key term within the title
- `,` — create a two-part structure with contrast

### Title Anti-Patterns

- Only summarizing the topic, such as `OpenClaw 企业应用分析`
- Empty grand narratives, such as `AI Agent 的未来趋势`
- Cheap bait that the article cannot justify
- Hiding the core object too late in the title
- Using generic modifiers without evidence, such as `最强`, `彻底`, `颠覆`, `必看`
- Overpromising practical value when the article is mainly opinion
- Repeating the exact same hook in title and digest

---

## Digest (摘要) Optimization

- **Hard limit:** ≤54 Chinese characters (WeChat enforces 120 UTF-8 bytes)
- **Must contain:** Core keyword + a hook (curiosity gap or benefit promise)
- **Must NOT:** Repeat the title, use vague descriptions, or summarize the whole article
- **Best practice:** Tease a specific insight from the article that the title doesn't reveal

Example:
> Title: "5年产品经理总结的3个反直觉认知"
> Digest: "第二个我当年不信，结果踩了半年的坑才服气。" (24 chars, specific, creates curiosity)

---

## In-Article SEO

### Keyword Placement Strategy

| Position | Rule |
|----------|------|
| First 200 characters | Core keyword must appear at least once |
| Full article | Core keyword 3-5 times, naturally distributed (NOT clustered) |
| H2 subheadings | Include long-tail keyword variations in at least 1-2 subheadings |
| Image alt text | Include keyword where relevant |

### Keyword Density Rules
- Natural integration only. If a keyword feels forced, rephrase the sentence.
- WeChat search prefers **keyword consistency** — don't swap synonyms. Pick one term and use it throughout.
- Long-tail keywords improve search ranking exposure by ~70% vs. broad terms.

### Keyword Research Methods
1. **WeChat Index** (微信指数) — volume data for trending terms
2. **WeChat search autocomplete** — type partial queries, note suggestions (= long-tail gold)
3. **Competitor analysis** — what keywords do high-performing articles in your vertical use?
4. **Reader comments/DMs** — the exact words your audience uses to describe their problems
5. **5118 / Aizhan** — cross-platform keyword research for broader context

---

## WeChat Search (搜一搜) SEO

### Peoplerank Algorithm — 3 Weight Categories

**Account Authority (40%):**
- Verified accounts rank higher than personal accounts
- Follower count is "the most core factor determining account weight"
- Account age + name consistency boost authority
- Original content rate: high originality + high repost rates = authority signal
- Publishing frequency: daily/consistent publishers rank higher
- **Vertical specialization:** Accounts focused on one topic get categorized faster by the algorithm

**Content Quality (30%):**
- Title: core keyword in first 15 characters, 1-2 keyword mentions max
- Body: 3-5 natural keyword placements, grammatically correct, fresh information
- Structure: proper headings create natural keyword distribution
- Formatting: clean layout (three-color rule, proper spacing, no watermarks)
- Originality: original articles receive **3x more recommendation weight** than reprints
- Engagement signals: comments and 在看 signal quality

**User Behavior (30%):**
- Reading duration: longer natural reading time = positive signal
- Completion rate: higher = better ranking
- Social signals: likes, shares, 在看, rewards all impact ranking
- Comment interaction: author-reader exchanges boost weight

### Tag Strategy
- 5 tags per article: 2 industry + 2 trending keywords + 1 long-tail
- Specific tags outperform broad ones
- Consistent tagging pattern increases long-tail traffic by ~30%
- Tags must align with title and body keywords

---

## Completion Rate Optimization

Target: **>55%** to advance in traffic pools. Ideal: **>65%**.

### Structural Techniques

| Technique | Impact |
|-----------|--------|
| Line break every 3-5 sentences | Creates visual breathing room |
| Bold key information | Creates scannable "anchor points" readers commit to reaching |
| Section subheadings every 400-600 words | Creates "chapters" reader commits to completing |
| Mid-article interactive question | Activates reader thinking, increases engagement |
| Visual element every 600 characters | Breaks text monotony (chart, quote block, image) |
| Never exceed 7-10 text lines without a break | Prevents "wall of text" abandonment |

### Content Techniques
- Front-load value: the reader should learn something useful in the first 300 words
- Every 3-4 paragraphs, insert a hook (question, data surprise, scene shift, "but here's the thing...")
- Vary paragraph length (see writing-guide.md rhythm section)
- Tease upcoming content: "但最让我意外的不是这个，而是接下来发生的事"

---

## End-of-Article Optimization

This section directly impacts shares, 在看, and comments — the three highest-weighted algorithm signals.

### Footer Design Checklist
1. **Engagement trigger:** A specific question tied to article content (not generic "你怎么看?")
2. **Internal links:** 3 top-performing previous articles (boosts account session time)
3. **CTA:** Emphasize what the READER gets from following/sharing (not what you want)
4. **Reminder:** Prompt for 在看/分享/关注 — but tie it to value, not obligation

### Best Publishing Times
| Slot | Best For |
|------|----------|
| 8:00-9:00 AM | News, timely content, morning commute readers |
| 12:00-1:00 PM | Lunch break. Light reads, listicles, tools |
| 9:00-11:00 PM | Prime time. Deep reads, opinion pieces, stories. Highest engagement. |

**Counter-intuitive:** The 5-8 PM slot has the most competition. Average open rate is actually LOWER despite high traffic. Less crowded time slots can outperform.

---

## Gotchas

**"Keyword stuffing reflex":** If the keyword appears more than 5 times in 2000 words, you're stuffing. The algorithm detects this and it reads terribly. 3-5 natural occurrences is the sweet spot.

**"The generic tag trap":** Tags like "科技" or "生活" are nearly useless. "AI产品经理" or "远程办公效率" are 10x more effective for search discovery.

**"Optimizing for search, forgetting humans":** SEO is a multiplier, not a foundation. A perfectly optimized boring article still fails. Write for humans first, optimize for search second.

**"Ignoring the social engine":** In 2025, friend recommendations exceed subscription feeds as the primary traffic source. One account showed 45.9% of reads from social recommendations. Your article must be SHARE-WORTHY, not just search-friendly.
