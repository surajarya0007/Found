# Found

Found is an AI-assisted job search dashboard with:

- `frontend/`: Next.js UI (dashboard, jobs, networking, referrals, applications, profile)
- `backend/`: REST API used by the UI

## Run locally

1. Start backend:

```bash
cd backend
npm run dev
```

2. Start frontend in another terminal:

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Current backend capabilities

- Dashboard stats/activity/network growth
- Job listing + quick apply endpoint
- Applications board + analytics data
- Networking connections/follow-ups + outreach draft/send endpoint
- Referrals listing + request endpoint
- Profile + persistent AI settings endpoint (SQLite-backed)
- Automation run simulation endpoint (`dry-run` / `live`)
- LinkedIn agent module for job discovery, application workflow, recruiter outreach, and referral request planning/execution
- LinkedIn browser automation endpoint (`/api/v1/agents/linkedin/browser-runs`)
- External ATS connectors (Greenhouse + Lever) with import endpoint (`/api/v1/integrations/jobs/import`)

## Important note

Automation includes approval gates by design. Browser actions and automated submission require explicit request approvals and backend environment flags.
