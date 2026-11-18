# Map — Satellite & Traffic

An interactive map of Tehran presented inside a centered, iPhone-inspired frame. Switch between satellite imagery and a street map with traffic flow using glass-style controls inside the phone screen.

**[Explore the source →](https://github.com/Alihkz1/map)**

## Experience

A white canvas keeps the focus on the map. The phone frame includes a top island, a decorative status bar, side buttons, and a home indicator. Satellite and Traffic controls sit at the bottom of the screen, alongside the map's native zoom controls and provider attribution.

The frame is an iPhone-style visual concept, not an official device specification. Its status bar is decorative and does not reflect device time or battery level.

## Features

- **Satellite imagery:** TomTom satellite tiles, selected by default when an API key is configured.
- **Traffic view:** a TomTom street basemap with a traffic-flow overlay.
- **Reliable mode selection:** keeps the latest selected mode while the map style initializes; switches layer visibility without recreating the map.
- **Street-map fallback:** an OpenStreetMap layer remains underneath the provider layers. Failed TomTom layers are hidden so the remaining layers can stay visible.
- **Error recovery:** an in-screen notice and a **Try again** action for failed map requests.
- **Responsive frame:** adapts to the viewport, with map resizing handled by `ResizeObserver`.
- **Accessible controls:** labeled map modes, pressed-state indicators, and status messages.

## Built with

| Technology | Purpose |
| --- | --- |
| Next.js 16 / App Router | Application framework and routing |
| React 19 | Map component and interactive state |
| TypeScript | Typed components and map configuration |
| MapLibre GL JS | Map rendering, raster layers, and navigation controls |
| CSS / Tailwind CSS 4 | Layout, phone frame, and glass-style controls |
| TomTom | Satellite imagery, street tiles, and traffic flow |
| OpenStreetMap | Fallback street tiles |

## Run locally

```bash
git clone https://github.com/Alihkz1/map.git
cd map
npm ci
```

Create `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_TOMTOM_API_KEY=your_tomtom_api_key
```

Start the development server:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

The key needs access to the TomTom satellite, street-map, and traffic-flow services used by this application. Restart the development server after changing it.

Without a key, the app displays the OpenStreetMap fallback, shows a configuration notice, and disables both mode buttons. Map tiles require a working internet connection; the fallback is not an offline map.

## Project structure

```text
map/
├── app/
│   ├── components/
│   │   └── Map.tsx       # Map sources, mode switching, retries, and phone markup
│   ├── globals.css      # Global styles, phone frame, and controls
│   ├── layout.tsx       # Root layout, fonts, and page metadata
│   └── page.tsx         # Home page
├── public/              # Static assets
├── next.config.ts       # Next.js and CSS tooling configuration
├── package.json         # Dependencies and scripts
├── package-lock.json    # Locked dependency versions
├── tsconfig.json        # TypeScript configuration
└── README.md
```

## How the map works

1. MapLibre initializes at Tehran, centered on longitude `51.389` and latitude `35.6892`, at zoom level `11`.
2. The OpenStreetMap fallback is added first. TomTom sources are added when the API key is present.
3. Satellite mode shows satellite imagery. Traffic mode shows the street basemap and traffic-flow overlay.
4. Switching modes changes layer visibility. If a selection happens before the style is ready, it is applied when the style finishes loading.
5. A failed TomTom source is hidden and an error notice appears. **Try again** resets the failed-source state and reloads raster sources.

Traffic availability depends on provider access and coverage. The app requests traffic tiles when needed; it does not implement a periodic traffic-refresh timer.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Customize

| Change | File |
| --- | --- |
| Initial coordinates, zoom, and default map mode | `app/components/Map.tsx` |
| Tile sources, attribution, and error handling | `app/components/Map.tsx` |
| Button labels, icons, and phone markup | `app/components/Map.tsx` |
| Phone dimensions, colors, and glass effects | `app/globals.css` |
| Page title, description, and fonts | `app/layout.tsx` |
| TomTom API key | `.env.local` locally; environment settings on your host |

## Deployment

Deploy the repository as a Next.js application. For Vercel, use the repository root as the Root Directory and select the Next.js framework preset. The build script is `npm run build`; let the framework preset manage the output directory.

Set `NEXT_PUBLIC_TOMTOM_API_KEY` in the hosting environment before building. Public Next.js environment variables are included in the browser bundle, so changing the deployed key requires a new build and deployment.

This app has no application backend or database. The browser requests tiles directly from map providers.

## API keys & attribution

`NEXT_PUBLIC_TOMTOM_API_KEY` is visible in browser requests by design. Use a key intended for browser access and configure applicable restrictions and quotas in your provider account. Keep local environment files out of Git.

Retain TomTom and OpenStreetMap attribution when changing the interface. Provider access, usage limits, and service terms apply to map tile requests.

## Author

**Ali Hosseinkhani**

- [GitHub — alihkz1](https://github.com/alihkz1)
- [LinkedIn — alihkz](https://www.linkedin.com/in/alihkz/)
- [Instagram — alihkz](https://www.instagram.com/alihkz/)
- [Telegram — alihkz](https://t.me/alihkz)
