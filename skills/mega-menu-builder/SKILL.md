---
name: mega-menu-builder
description: Build product mega menus with proper structure
---
# Mega Menu Builder

## When to Use
- Building a new product navigation mega menu
- Adding new product categories/subcategories to existing menu
- Restructuring navigation for better UX

## When Not to Use
- Simple header navigation (use basic dropdown instead)
- Footer navigation (use sitemap-style listing)

## Process
1. **Define Menu Structure**: Categories → Subcategories → Products. Max 3 levels deep.
2. **API Design**: Create backend endpoint that returns structured menu data (categories with nested products).
3. **Database Setup**: Create menu collection with fields: title, slug, parent_id, sort_order, icon, featured.
4. **Frontend Component**: Build React mega menu with proper hover/click behavior, keyboard navigation.
5. **Styling**: Full-width dropdown with columns. Add hover effects, transitions.
6. **Responsive**: Mobile hamburger menu with accordion for nested items.
7. **Performance**: Lazy load menu data, cache API response, avoid layout shift.
8. **Admin Panel**: Create drag-and-drop menu builder in admin with preview.

## Quality Gates
- [ ] Menu structure is max 3 levels deep
- [ ] Backend endpoint returns paginated/filtered menu data
- [ ] Frontend component has keyboard navigation (Tab, Enter, Escape)
- [ ] Mobile menu works as accordion
- [ ] Menu data is cached (avoid refetch on every page load)
- [ ] Admin panel allows reordering items
- [ ] No layout shift when menu loads

## Related Skills
- frontend-ui-engineering: UI component best practices
- api-and-interface-design: Clean API design for menu data
- performance-optimization: Ensure menu is performant
