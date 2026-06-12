---
name: seo-meta-optimizer
description: Optimize meta tags and OG for CMS pages
---
# SEO Meta Optimizer

## When to Use
- Creating new CMS pages or blog posts
- Redesigning page layout or templates
- SEO audit and improvement cycle

## When Not to Use
- For technical SEO (use sitemap, robots.txt, canonical tools)
- For backlink strategy (use marketing tools)

## Process
1. **Unique Title**: Every page must have unique `<title>` (50-60 chars). Include primary keyword.
2. **Meta Description**: Write compelling meta description (150-160 chars) with call to action.
3. **Open Graph Tags**: Implement `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on every page.
4. **JSON-LD Structured Data**: Add appropriate schema markup (Product, Article, Organization, etc.).
5. **Canonical URLs**: Set canonical URL to avoid duplicate content issues.
6. **Sitemap Update**: Add new page to `sitemap.xml` with proper priority and change frequency.
7. **Robots Meta**: Set proper `index`/`noindex`, `follow`/`nofollow` directives.
8. **Image Alt Tags**: Ensure all page images have descriptive alt text with keywords.

## Quality Gates
- [ ] Every page has unique title (50-60 chars)
- [ ] Meta description written (150-160 chars)
- [ ] OG tags present on all public pages
- [ ] JSON-LD structured data implemented per page type
- [ ] Canonical URL set (prevents duplicate content penalties)
- [ ] Sitemap.xml updated and submitted to search consoles
- [ ] Robot meta tags configured correctly

## Related Skills
- performance-audit-cms: Check how SEO changes affect performance
- gallery-optimizer: Image optimization for OG images
- code-review-and-quality: Review SEO changes before deploy
