import test from "node:test";
import assert from "node:assert/strict";

import { renderXMarkdown, selectRecommendedXVideoFormat, toXThreadItems } from "./fetchArticle.js";

const sampleItems = [
  {
    id: "root",
    text: "Root post",
    createdAt: "Thu Apr 09 20:10:52 +0000 2026",
    user: {
      name: "Andrej Karpathy",
      screenName: "karpathy"
    },
    replyCount: 10,
    retweetCount: 20,
    quoteCount: 3,
    likeCount: 400,
    bookmarkCount: 50,
    viewCount: "1000"
  },
  {
    id: "reply",
    text: "Reply post",
    createdAt: "Thu Apr 09 20:38:48 +0000 2026",
    inReplyToTweetId: "root",
    isReply: true,
    user: {
      name: "Another User",
      screenName: "another"
    },
    replyCount: 1,
    retweetCount: 2,
    quoteCount: 0,
    likeCount: 30,
    bookmarkCount: 4,
    viewCount: 500
  }
] satisfies Record<string, unknown>[];

test("renderXMarkdown includes per-post author and metrics", () => {
  const markdown = renderXMarkdown(sampleItems);

  assert.match(markdown, /作者：Andrej Karpathy \(@karpathy\)/);
  assert.match(markdown, /互动：评论 10 · 转发 20 · 引用 3 · 点赞 400 · 收藏 50 · 查看 1000/);
  assert.match(markdown, /作者：Another User \(@another\)/);
  assert.doesNotMatch(markdown, /回复：root/);
});

test("toXThreadItems preserves author, relations, metrics, and text", () => {
  const threadItems = toXThreadItems(sampleItems);

  assert.deepEqual(threadItems[1], {
    id: "reply",
    index: 1,
    text: "Reply post",
    user: {
      name: "Another User",
      screenName: "another"
    },
    createdAt: "Thu Apr 09 20:38:48 +0000 2026",
    metrics: {
      replyCount: 1,
      retweetCount: 2,
      quoteCount: 0,
      likeCount: 30,
      bookmarkCount: 4,
      viewCount: 500
    },
    isReply: true,
    isQuote: false,
    isRetweet: false,
    inReplyToTweetId: "root",
    media: [],
    video: null
  });
}
);

test("selectRecommendedXVideoFormat prefers 720p instead of the largest format", () => {
  const selected = selectRecommendedXVideoFormat([
    {
      url: "https://video.example/360.mp4",
      format_id: "http-832",
      width: 498,
      height: 360,
      ext: "mp4",
      filesize_approx: 6909032
    },
    {
      url: "https://video.example/1080.mp4",
      format_id: "http-10368",
      width: 1494,
      height: 1080,
      ext: "mp4",
      filesize_approx: 86097168
    },
    {
      url: "https://video.example/720.mp4",
      format_id: "http-2176",
      width: 996,
      height: 720,
      ext: "mp4",
      filesize_approx: 18069776
    }
  ]);

  assert.equal(selected?.url, "https://video.example/720.mp4");
  assert.equal(selected?.resolution, "996x720");
  assert.equal(selected?.filesizeApprox, 18069776);
});

test("renderXMarkdown keeps root author posts first and limits other replies by engagement", () => {
  const items: Record<string, unknown>[] = [
    {
      id: "root",
      text: "Root post",
      user: { name: "Root Author", screenName: "root" },
      likeCount: 1
    },
    {
      id: "other-low",
      text: "Low engagement reply",
      user: { name: "Other Low", screenName: "low" },
      isReply: true,
      likeCount: 1
    },
    {
      id: "promoted",
      text: "High engagement promoted post",
      user: { name: "Promoted", screenName: "promoted" },
      isReply: false,
      likeCount: 100000
    },
    {
      id: "root-reply",
      text: "Root author follow-up",
      user: { name: "Root Author", screenName: "root" },
      isReply: true,
      likeCount: 0
    },
    ...Array.from({ length: 11 }, (_value, index) => ({
      id: `other-${index}`,
      text: `Other reply ${index}`,
      user: { name: `Other ${index}`, screenName: `other${index}` },
      isReply: true,
      likeCount: 100 - index,
      retweetCount: index === 10 ? 1000 : 0
    }))
  ];

  const markdown = renderXMarkdown(items);

  assert.ok(markdown.indexOf("Root author follow-up") < markdown.indexOf("## 高互动其他线程"));
  assert.match(markdown, /Other reply 10/);
  assert.doesNotMatch(markdown, /Low engagement reply/);
  assert.doesNotMatch(markdown, /High engagement promoted post/);
});
