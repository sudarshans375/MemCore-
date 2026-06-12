---
name: gallery-optimizer
description: Optimize gallery/media for performance and display
---
# Gallery Optimizer

## When to Use
- Adding new images/media to a gallery section
- Improving page load performance
- Redesigning gallery display

## When Not to Use
- For video optimization (use dedicated video optimization)
- For single hero images (use standard image optimization)

## Process
1. **Image Compression**: Convert images to modern formats (WebP/AVIF) with fallback. Use sharp or similar.
2. **Lazy Loading**: Implement `loading="lazy"` for all below-the-fold gallery images.
3. **Responsive Breakpoints**: Test gallery display at 320px, 768px, 1024px, 1440px.
4. **Sort Order**: Set meaningful sort order (newest first, custom ordering, or manual).
5. **CDN Verification**: Ensure all media URLs point to CDN (not local server) in production.
6. **Accessibility**: Add `alt` text to all gallery images.
7. **Lightbox/Modal**: Ensure gallery click opens proper lightbox with navigation.

## Quality Gates
- [ ] All images converted to WebP with JPEG fallback
- [ ] Lazy loading implemented on gallery images
- [ ] Gallery responsive on mobile, tablet, desktop
- [ ] Sort order is logical and consistent
- [ ] CDN URLs verified in production build
- [ ] All images have alt text
- [ ] Lightbox navigation works end-to-end

## Related Skills
- frontend-ui-engineering: Broader UI best practices
- performance-optimization: General performance improvements
- seo-meta-optimizer: Meta tags for gallery pages
