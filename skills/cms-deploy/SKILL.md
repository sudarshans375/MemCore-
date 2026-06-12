---
name: cms-deploy
description: Deploy CMS projects (frontend + backend + admin) to production safely
---
# CMS Deployment Workflow

## When to Use
- Deploying frontend (Next.js), backend (Node.js/Express), or admin panel
- Production hotfixes that need careful rollout
- First-time deployment setup for a new environment

## When Not to Use
- Local development (use docker-compose up instead)
- CI/CD pipeline already handles deployment (use the pipeline)

## Process
1. **Build Check**: Run `npm run build` on all three projects. Fix any build errors first.
2. **Verify Environment Variables**: Check `.env.production` has all required vars. Verify API URLs point to production.
3. **Deploy Order**: Always deploy in order: Backend → Admin Panel → Frontend.
4. **Run Migrations**: Execute any pending DB migrations before deploying new code.
5. **Verify Endpoints**: After backend deploy, test health endpoint `/api/health`.
6. **Smoke Test**: After full deploy, test critical user flows (login, content CRUD, public pages).
7. **Rollback Plan**: Have the previous Docker image tag ready for immediate rollback.

## Quality Gates
- [ ] `npm run build` passes on all 3 projects
- [ ] All environment variables verified
- [ ] Backend health check passes
- [ ] Database migrations applied
- [ ] Admin panel login works
- [ ] Frontend loads without errors
- [ ] Rollback strategy documented

## Related Skills
- ci-cd-and-automation: Automate this deploy process
- observability-and-instrumentation: Monitor the deployed app
- shipping-and-launch: Broader launch preparation
