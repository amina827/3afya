# 3afya Frontend

Next.js frontend for the Afia oil-level detection flow.

## Setup

1. Install dependencies.
2. Configure API URL.
3. Run the app.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

- Local Django default: `http://127.0.0.1:8000`
- Production: set `NEXT_PUBLIC_API_URL` to your deployed backend origin (no trailing slash).

If this value is wrong or backend CORS is not configured, the detect page will show a network fetch error.
