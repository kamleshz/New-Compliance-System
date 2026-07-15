# Deploy the Compliance System

The production setup uses:

- **Vercel** for the React/Vite frontend
- **Render** for the Node/Express backend
- **MongoDB Atlas** for the database

## 1. Prepare production services

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Create a MongoDB Atlas cluster and database user.
3. Ensure the Atlas network rules allow the Render service to connect.
4. Ensure the CCP API configured by `CCP_API_BASE_URL` is reachable from the public internet. A localhost URL cannot be reached by Render.

## 2. Deploy the backend on Render

The repository includes `render.yaml`, so the simplest option is **New > Blueprint** in Render and selecting this repository.

For a manual Render Web Service, use:

- Root directory: `backend`
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`

Add the values shown in `backend/.env.example` to the Render environment. At minimum, configure:

- `MONGO_URI`
- `JWT_SECRET` (the Blueprint can generate this)
- `CCP_API_BASE_URL`
- `CCP_API_KEY`
- `FRONTEND_URL`, `APP_BASE_URL`, and `CORS_ORIGINS` after Vercel provides the frontend URL

After deployment, verify:

`https://YOUR-RENDER-SERVICE.onrender.com/api/health`

It should return `{ "status": "ok" }`.

## 3. Deploy the frontend on Vercel

Import the same repository into Vercel and configure:

- Framework preset: Vite
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Add this Vercel environment variable for Production, Preview, and Development as required:

`VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

Deploy the project. `frontend/vercel.json` makes client-side routes work when a page is opened or refreshed directly.

## 4. Connect both deployments

Copy the final Vercel URL and set these Render variables to it without a trailing slash:

```text
FRONTEND_URL=https://YOUR-PROJECT.vercel.app
APP_BASE_URL=https://YOUR-PROJECT.vercel.app
CORS_ORIGINS=https://YOUR-PROJECT.vercel.app
```

Use comma-separated URLs in `CORS_ORIGINS` if a custom domain also needs access. Redeploy Render after changing the variables, then test login and file viewing from the Vercel site.

## Production upload note

Do not rely on Render's local filesystem for permanent uploads. This project currently persists uploaded data in MongoDB; large Base64 files can exceed MongoDB's document-size limit. Before heavy production use, store files in object storage such as S3, Cloudinary, or Cloudflare R2 and keep only each file's URL and metadata in MongoDB.
