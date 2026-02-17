# Found Backend

Structured TypeScript backend for Found.

## Stack

- Node.js
- TypeScript
- Express
- Modular architecture (routes + services + shared store)
- SQLite (`better-sqlite3`) for persisted app state
- Playwright Core for LinkedIn browser automation hooks

## Run

```bash
npm install
npm run dev
```

Server runs on `http://localhost:4000`.

## Environment

Create `.env` from `.env.example` and adjust values as needed.

## Build + Start

```bash
npm run build
npm run start
```

## API

- `GET /api/health`
- `GET /api/v1/dashboard`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs/:id/apply`
- `GET /api/v1/applications`
- `PATCH /api/v1/applications/:id/status`
- `GET /api/v1/network/connections`
- `GET /api/v1/network/followups`
- `POST /api/v1/network/messages/draft`
- `POST /api/v1/network/outreach`
- `GET /api/v1/referrals`
- `POST /api/v1/referrals/request`
- `GET /api/v1/profile`
- `PUT /api/v1/profile/ai-settings`
- `GET /api/v1/automation/runs`
- `POST /api/v1/automation/runs`
- `GET /api/v1/agents/linkedin/config`
- `PUT /api/v1/agents/linkedin/config`
- `GET /api/v1/agents/linkedin/opportunities`
- `GET /api/v1/agents/linkedin/runs`
- `POST /api/v1/agents/linkedin/runs`
- `GET /api/v1/agents/linkedin/browser-runs`
- `POST /api/v1/agents/linkedin/browser-runs`
- `GET /api/v1/integrations/jobs`
- `POST /api/v1/integrations/jobs/import`

## Notes

- State is persisted in SQLite at `backend/data/found.db` by default.
- LinkedIn browser automation requires valid LinkedIn credentials and a local Chromium/Chrome runtime.
- Auto-submission is disabled by default and requires explicit env + request approval flags.
