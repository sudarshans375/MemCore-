---
name: api-guard
description: Audit and harden API endpoints for security
---
# API Guard - Security Hardening

## When to Use
- Before deploying a new API endpoint
- After adding auth middleware changes
- When handling user input or file uploads
- Periodic security audits

## When Not to Use
- For frontend-only security (use content-security-policy instead)
- For database-level security (use row-level security instead)

## Process
1. **Verify Auth Middleware**: Ensure all admin routes have auth middleware. Check for missing `auth` imports in route files.
2. **Check Input Validation**: All POST/PUT/PATCH endpoints must validate input. Check for `validate` middleware usage.
3. **Add Rate Limiting**: Public endpoints should have rate limiting. Check if `express-rate-limit` is configured.
4. **Error Handling**: Ensure no stack traces leak in production errors. Check for proper error middleware.
5. **CORS Settings**: Verify CORS is configured properly — not too permissive in production.
6. **SQL Injection Prevention**: Check for parameterized queries in all database operations.
7. **File Upload Security**: Validate file types, size limits, and scan uploads.

## Quality Gates
- [ ] All admin routes have auth middleware
- [ ] Input validation exists on all mutation endpoints
- [ ] Rate limiting enabled on public endpoints
- [ ] No stack traces in error responses
- [ ] CORS restricts to known origins
- [ ] SQL queries use parameterized inputs

## Related Skills
- security-and-hardening: Broader security practices
- code-review-and-quality: General code review process
- deprecation-and-migration: Securely deprecate old endpoints
