# NIRIKSHAN Frontend

Standalone Next.js 14 App Router frontend using JavaScript, Tailwind CSS, and
ESLint.

## Setup and run

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

On macOS/Linux, use `cp .env.local.example .env.local` instead of `copy`.

The development server runs at `http://localhost:3000`.

## Design system

The application uses Noto Sans for body/UI text and IBM Plex Mono for standard
codes and technical parameter values.

Tailwind color tokens:

- `primary`: `#0B3D6E`
- `primaryDark`: `#072A4D`
- `accent`: `#D9730D`
- `bg`: `#F5F7FA`
- `surface`: `#FFFFFF`
- `border`: `#D7DEE5`
- `text`: `#1A2733`
- `textMuted`: `#5B6B7A`
- `success`: `#1E7B45`
- `warning`: `#B9770E`
- `error`: `#B3261E`

Cards and layout separation use 1px borders rather than heavy shadows. The
default radius is a restrained 6px. A single fixed saffron-white-green strip
marks the top of the viewport. Interactive elements use visible accent-colored
keyboard focus rings, and the dark navy/light surface pairings are chosen for
WCAG-AA readability.

## Environment

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the backend URL using
[.env.local.example](./.env.local.example). All browser API requests use this
environment variable through `lib/api.js`.

## Deploying to Vercel

1. Push the project to GitHub.
2. Import the repository at <https://vercel.com/new>.
3. Set the project's root directory to `frontend/`.
4. Add `NEXT_PUBLIC_API_BASE_URL` in the Vercel project settings and set it to
   the Railway backend URL from the backend deployment, for example:

   ```text
   NEXT_PUBLIC_API_BASE_URL=https://manaksetu-backend.up.railway.app
   ```

Vercel's free Hobby plan is sufficient for this prototype.
