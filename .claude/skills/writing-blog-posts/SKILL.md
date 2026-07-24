---
name: writing-blog-posts
description: Use when adding or editing a blog post — file location, naming, and frontmatter schema for the MDX blog collection
---

# Writing Blog Posts

Posts are MDX files in `src/content/blog/`, validated by the schema in
`src/content.config.ts`. The filename (kebab-case, `.mdx`) becomes the
slug: `designing-for-failure.mdx` → `/blog/designing-for-failure`.

## Frontmatter

```yaml
---
title: 'Post title'
date: 2026-07-24          # publication date
tags: ['distributed']      # lowercase, short; reused across posts for filtering
excerpt: 'One or two sentences shown on the blog index.'
draft: false               # true = excluded from index and build
---
```

## Conventions

- Tags power the blog-index filters — reuse existing tags where they fit
  rather than inventing near-duplicates (check other posts first).
- Keep excerpts self-contained; they render outside the post.
- Start drafts with `draft: true`; flip to `false` to publish.
- After adding a post, `pnpm build` must pass — schema errors fail the build.
