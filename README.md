# Anzen PPE Detection Frontend

Anzen is a demo frontend and dashboard for a PPE kit detection system. It is designed to connect later to a YOLO/Roboflow model backend while staying usable today with mock data.

## What is included

- Landing page explaining the project, why it matters, and how the detection flow works.
- Demo login modal with a quick login button.
- Dashboard with PPE violation metrics, temporary worker identification, zone filters, search, history, and violation severity/status.
- Mock REST API server using Node.js with no external dependencies.
- Static fallback mode that works by opening `index.html` directly.

## Run locally

```powershell
node server.js
```

Then open:

```text
http://localhost:4173
```

## Mock API endpoints

- `POST /api/login`
- `GET /api/dashboard`
- `GET /api/summary`
- `GET /api/violations`
- `GET /api/zones`
- `GET /api/violation-mix`

When the real backend is ready, update `api.getDashboard()` in `app.js` to call the live API instead of `data/mock-api.json`.
