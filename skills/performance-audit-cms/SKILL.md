---
name: performance-audit-cms
description: Audit CMS frontend performance (Core Web Vitals)
---
# Performance Audit CMS

## When to Use
- Before major feature launch
- When Core Web Vitals scores drop
- Monthly/quarterly performance review
- Client reports slow page loads

## When Not to Use
- Server-side performance (use observability-and-instrumentation)
- Database query optimization (use database profiling tools)

## Process
1. **Lighthouse Audit**: Run Lighthouse on top 5 pages. Target: 90+ Performance, 90+ Accessibility.
2. **Core Web Vitals Check**: Check LCP (<2.5s), FID (<100ms), CLS (<0.1) using PageSpeed Insights.
3. **Bundle Analysis**: Run `next-bundle-analyzer` to identify large dependencies.
4. **Image Audit**: Check all images are optimized, lazy-loaded, properly sized. Use WebP format.
5. **CSS/JS Audit**: Remove unused CSS/JS. Check render-blocking resources.
6. **Caching Strategy**: Verify CDN caching headers, service worker, and static asset caching.
7. **Third-Party Scripts**: Audit third-party scripts impact. Consider deferred loading.
8. **Web Vitals Report**: Generate before/after comparison for all metrics.

## Quality Gates
- [ ] Lighthouse Performance ≥ 90 on top 5 pages
- [ ] LCP < 2.5s on mobile
- [ ] CLS < 0.1
- [ ] No render-blocking resources above fold
- [ ] All images use WebP with lazy loading
- [ ] Bundle size under recommended limits
- [ ] CDN caching headers set for static assets

## Related Skills
- performance-optimization: Broader performance improvements
- gallery-optimizer: Image-specific optimization
- observability-and-instrumentation: Monitor production performance
- shipping-and-launch: Pre-launch performance checklist
