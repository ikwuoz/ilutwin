# ÌlúTwin — From Smartphone Video to Actionable 3D Urban Upgrades

**Community 3D Digital Twin & Civic Co-Design Tool for Lagos Informal Settlements** — built for the **Aholo Global 3D AI Hackathon**.

### The Problem
Over **60% of Lagos residents** (roughly **two out of three** people across the metropolis) live in dense, fast-growing informal settlements such as Makoko, Mushin, and Ajegunle, according to urban diagnostics from the [African Cities Research Consortium (ACRC)](https://www.african-cities.org/lagos/) and the [World Bank (*Africa’s Cities: Opening Doors to the World*)](https://openknowledge.worldbank.org/handle/10986/25896). Traditional land surveying is too slow, expensive, and physically difficult in narrow, maze-like streets—leaving local leaders, NGOs, and urban planners without clear ground-level visibility into urgent issues like blocked drainage, unlit alleys, waste overflow, and flood-prone walkways.

### The Solution
**ÌlúTwin** turns any resident’s smartphone into a rapid 3D civic-mapping and co-design tool:

1. **Reconstruct Real Streets (Aholo World 3DGS):** Walk down a street recording a short video (`.mp4`, `.mov`, `.insv`) or 20+ overlapping photos to generate an interactive 3D Gaussian Splatting (`3DGS`) twin of the real environment.
2. **Report Issues & Generate Practical Upgrades (Aholo Lux3D `G1-Turbo`):** Explore the street in 3D, inspect built-in community hotspots (**Flooding**, **No Streetlight**, **Waste Overflow**), or click **Drop New Pin** anywhere on the street to report **Open Drain**, **Dark Alley**, **Flooded Walkway**, or **Custom Prompt** issues and generate locally adapted `.glb` upgrades (with automatic local catalog fallback for offline/live demos).
3. **Compare Before & After + Export Planner Briefs:** Toggle smoothly between **Current Reality** and **Lux3D Upgrade** (`V`), glide across **Camera Presets** (`1`–`4`), track live Naira (`₦`) deployment cost estimates and impacted households, and export a **JSON report** or **Printable Community Upgrade Brief**.

### Impact
Instead of top-down guesses, urban planners, community leaders, and NGOs get accurate spatial context paired with resident-approved 3D upgrade proposals ready for budgeting and action.

### Submission Deliverables

- **Demo Pitch Video:** [`deliverables/ilutwin-demo.mp4`](deliverables/ilutwin-demo.mp4) (`1920x1080`, `30fps`, `75.5s` voiced walkthrough)
- **Process & Results PDF:** [`deliverables/ilutwin-case-study.pdf`](deliverables/ilutwin-case-study.pdf) (4-page report with field captures, baseline vs. upgrade comparisons, asset transforms & print-brief results)
- **Design System Spec:** [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)

### Judge Quick-Start (2-Minute Evaluation · Works Offline)

No external API key is needed to evaluate the 3D Explorer: `/public/models/lagos_street.spz` and `/public/models/*.glb` are bundled locally, and **Instant Catalog** lets you co-design without hitting paid endpoints.

1. Run `npm install && npm run dev` and open [http://localhost:3000/explore](http://localhost:3000/explore).
2. Inspect the street starting in **Current Reality** baseline mode (`₦0` deployed · `₦1,120,000` planned).
3. Press **`V`** (or click **Lux3D Upgrade**) to reveal the 3 calibrated `.glb` props (**Drain Cover**, **Solar Streetlamp**, **Waste Hub**).
4. Press keys **`1`–`4`** to glide between Overview, Drainage Hotspot, Alley Lighting, and Waste Hub presets.
5. **Drag** any 3D prop to reposition it (`Shift` + drag adjusts height) and click **Lock (`L`)** to lock its position to `localStorage`.
6. Click **Drop New Pin** -> click anywhere on the corridor -> pick **Instant Catalog** (or generate live via Lux3D if `AHOLO_API_KEY` is configured) and watch Naira (`₦`) budget & household reach update live (`₦1,120,000` -> `₦1,440,000` for an added Open Drain).
7. Click **Export JSON** or **Print Brief** to generate planner-ready deliverables.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **3D Rendering:** `three`, `@react-three/fiber`, `@react-three/drei` (`Splat`, `Gltf`, `Html`, `OrbitControls`, `TransformControls`), plus `@manycore/aholo-viewer`
- **Aholo SDKs:**
  - `@manycore/aholo-sdk-asset` (media uploads to Aholo OUS)
  - `@manycore/aholo-sdk-world` (3DGS street reconstruction & spatial generation)
  - `@manycore/aholo-sdk-lux3d` (Text-to-3D and Image-to-3D upgrade assets)
  - `@manycore/aholo-sdk-core` (shared client config & error handling)

---

## Project Structure

```text
ilutwin/
├── app/
│   ├── api/
│   │   ├── health/route.ts             # Checks server Aholo config status
│   │   ├── upload/route.ts             # Uploads street photos/videos via Aholo Asset SDK
│   │   ├── lux3d/
│   │   │   ├── generate/route.ts       # Starts Lux3D text-to-3D / img-to-3D (G1-Turbo)
│   │   │   └── model/route.ts          # Allowlisted same-origin proxy for Lux3D .glb URLs
│   │   ├── world/
│   │   │   ├── asset/route.ts          # Allowlisted same-origin proxy for Aholo World 3DGS/Pano assets
│   │   │   └── reconstruct/route.ts    # Starts Aholo World 3DGS reconstruction
│   │   └── tasks/status/route.ts       # Polls Lux3D or World task progress & outputs
│   ├── explore/page.tsx                # Full-viewport 3D Explorer, drag/lock, presets & print brief
│   ├── health/route.ts                 # Top-level health probe endpoint (GET /health)
│   ├── upload/page.tsx                 # Street capture & Lux3D asset generator UI
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                        # Landing page
├── components/
│   ├── AholoSceneViewer.tsx            # Primary @manycore/aholo-viewer 3DGS + GLB drag/raycast canvas
│   ├── ExploreViewer.tsx               # Probes .spz/.splat/.ply priority & picks Aholo vs R3F fallback
│   ├── Footer.tsx
│   ├── HotspotBadge.tsx                # Compact projected 3D hotspot pill & active card
│   ├── IluTwinMark.tsx                 # Brand SVG mark
│   ├── Navbar.tsx
│   ├── PrintablePlannerBrief.tsx       # @media print Community Upgrade Brief
│   ├── ReportIssueModal.tsx            # Interactive pin-drop & Lux3D generation modal
│   ├── SceneViewer.tsx                 # Procedural R3F 3D street fallback when no 3DGS asset exists
│   ├── SidebarUI.tsx                   # Floating glassmorphism HUD, Prop Placement Lock & Impact Summary
│   └── UploadPipeline.tsx              # Upload, trigger & live polling UI
├── lib/
│   ├── aholo/
│   │   ├── asset.ts                    # AssetClient wrapper
│   │   ├── config.ts                   # Server-side env & error normalization
│   │   ├── index.ts
│   │   ├── lux3d.ts                    # Lux3dClient wrapper (G1-Turbo / G1)
│   │   └── world.ts                    # WorldClient wrapper (reconstruct & generate)
│   ├── data/
│   │   └── upgrades.ts                 # Hotspots, camera presets, Naira impact math & templates
│   ├── presets/
│   │   └── lagos-upgrades.ts           # Lagos street scenarios & Lux3D asset prompts
│   ├── proxy/
│   │   └── aholoAssetProxy.ts          # Shared allowlisted remote asset proxy handler
│   ├── services/
│   │   └── aholoService.ts             # Client Lux3D generator with progress & local fallback
│   └── health.ts
├── public/
│   └── models/                         # lagos_street.spz (primary) / .splat / .ply + upgrade .glb props
├── deliverables/
│   ├── ilutwin-case-study.pdf          # Process screenshots, key asset comparison & final results
│   └── ilutwin-demo.mp4                # 1080p Gemini-TTS narrated demo video
├── types/
│   ├── aholo.ts
│   └── ilutwin.ts
├── DESIGN_SYSTEM.md                    # Color palette, spatial HUD tokens & typography rules
├── .env.local.example
└── package.json
```

---

## Getting Started

### 1. Prerequisites

- Node.js 20+ (tested on Node 24)
- npm 10+
- An **Aholo Open API Key**

### 2. How to Get Your Aholo API Key

1. Sign in to the **Aholo Developer Portal** (Global: [https://labs.aholo.ai](https://labs.aholo.ai) or China: [https://labs.aholo.cn](https://labs.aholo.cn)).
2. Open your account / API Console and create a new **API Key**.
3. Note which region your key belongs to:
   - Global accounts use `AHOLO_REGION=com` (`https://api.aholo.ai`)
   - Mainland China accounts use `AHOLO_REGION=cn` (`https://api.aholo.cn`)

### 3. Configure Environment Variables

Copy the example env file to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set your key:

```env
AHOLO_API_KEY=your_actual_aholo_api_key
AHOLO_REGION=com
```

> **Security Note:** `AHOLO_API_KEY` is only read inside server-side Next.js API routes (`/app/api/*` and `/lib/aholo/*`). Never prefix it with `NEXT_PUBLIC_`.

### 4. Install Dependencies & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Using the App

1. **Home (`/`)** — Overview of the Lagos community digital twin workflow and ready-made upgrade presets.
2. **Upload & Generate (`/upload`)**:
   - **Aholo World (3DGS):** Upload a short street walkthrough video (`.mp4`, `.mov`, `.insv`) or **20+ overlapping photos** (`.jpg`, `.png`, `.webp`) to reconstruct a 3DGS scene, or use *Quick AI Scene* for a single reference photo.
   - **Aholo Lux3D (`G1-Turbo`):** Generate practical 3D upgrade assets from Lagos presets, custom text prompts, or a single photo (`img-to-3d`), then jump straight to `/explore`.
3. **3D Explorer (`/explore`)**:
   - Auto-loads `/models/lagos_street.spz` first (falling back to `.splat`, `.ply`, or the procedural R3F street if absent) inside `ExploreViewer` / `AholoSceneViewer` (`@manycore/aholo-viewer`), with remote World/Lux3D outputs streamed via `/api/world/asset` and `/api/lux3d/model`.
   - Opens in **Current Reality** baseline mode at the `Overview` camera angle (`V` toggles **Current Reality** ↔ **Lux3D Upgrade**, or pass `?mode=upgrade`).
   - Click projected 3D hotspot pills or use **Camera Presets** (`1` Overview, `2` Drainage Hotspot, `3` Alley Lighting, `4` Waste Hub) for smooth camera glides.
   - **Click-and-Drag + Lock Placement:** Props start unlocked for immediate 3D dragging across the street (`Shift` + drag adjusts vertical height); click **Lock** (`L`) in the **Prop Placement** HUD to lock a prop's resulting position into `localStorage` (`ilutwin.propTransforms.v1`) so camera orbiting never nudges it, or expand **Adjust** for fine `X/Y/Z`, `Scale`, `Rot Y`, and `Reset` controls.
   - Click **Drop New Pin** anywhere on the street to capture clamped `[x, y, z]` coordinates, pick an issue type or custom prompt, and place a live Lux3D `.glb` or Instant Catalog upgrade.
   - Review the **Civic Impact** summary (active upgrades, estimated Naira `₦` deployment cost, impacted households) and click **Export JSON** or **Print Brief**.

### Seeded Interventions & Keyboard Shortcuts

| Preset (`Key`) | Hotspot | Asset (`.glb`) | Est. Cost (`₦`) | Reach |
|---|---|---|---|---|
| `1` Overview | Full Street Corridor | All 3 props | `₦1,120,000` total | `85 hh` |
| `2` Drainage Hotspot | Flooded Alley Junction | `drain_cover.glb` | `₦480,000` (`15m Drain`) | `32 hh` |
| `3` Alley Lighting | Dark Market Footpath | `solar_lamp.glb` | `₦350,000` (`1 Solar Lamp`) | `28 hh` |
| `4` Waste Hub | Blocked Culvert Corner | `waste_hub.glb` | `₦290,000` (`1 Waste Hub`) | `25 hh` |

- **View Mode Toggle (`V`)**: Switches between **Current Reality** baseline and **Lux3D Upgrade**.
- **Lock / Unlock Prop (`L`)**: Prevents accidental nudges while orbiting after positioning a prop.

---

## Verification Commands

```bash
npx tsc --noEmit
npm run lint
npm run build
```
