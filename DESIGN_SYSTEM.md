# ÌlúTwin — Spatial 3D Civic Engineering Design System

> Synthesized from the four reference screenshots (**Ctrl**, **Nothing**, **Quietwork**, and **Faulkner Architects**) and tailored for **ÌlúTwin**: a Next.js 15 + Tailwind CSS v4 spatial 3D civic-mapping application powered by `@manycore/aholo-viewer`, `three` / `@react-three/fiber`, Aholo World (`3DGS`), and Aholo Lux3D.

---

## 1. Color Palette & Surface Hierarchy

The visual language pairs **Quietwork's** precision civic-engineering stone & forest green surfaces with **Ctrl's** crisp pill contrast, **Nothing's** technical obsidian spatial HUD discipline, and **Faulkner Architects'** unobstructed full-bleed viewport framing.

### 1.1 Base Surfaces (Editorial & Planning Pages: `/`, `/upload`, `@media print`)
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F2F2EF` | Primary light workspace background (Quietwork warm stone) |
| `--bg-surface` | `#FFFFFF` | Elevated cards, upload panels, printable brief surface |
| `--bg-surface-muted` | `#EAE9E4` | Secondary inset wells, KPI tiles, code/coordinate chips |
| `--bg-pill-track` | `#EEEDE9` | Floating navbar pill container and segmented control tracks (Ctrl) |
| `--ink-primary` | `#111312` | High-contrast headings, primary copy, dark pill CTAs |
| `--ink-secondary` | `#4A504C` | Supporting descriptions, resident notes |
| `--ink-muted` | `#6E7570` | Micro labels, axis metadata, timestamps |

### 1.2 Spatial HUD Surfaces (3D Explorer `/explore` Overlays)
Two translucent HUD themes ensure legibility over both bright sunlit Lagos street scans and dark night-lighting simulations:

| Token | Value | Backdrop / Border | Usage |
| :--- | :--- | :--- | :--- |
| `--hud-light` | `rgba(248, 247, 244, 0.84)` | `blur(20px) saturate(140%)` · `1px solid rgba(17, 19, 18, 0.12)` | Default daytime `SidebarUI`, `CameraPresets`, `ReportIssueModal` |
| `--hud-dark` | `rgba(12, 14, 17, 0.80)` | `blur(20px) saturate(140%)` · `1px solid rgba(255, 255, 255, 0.14)` | Night/Solar lighting mode (`walkway-solar`) & `AholoSceneViewer` 3DGS canvas |
| `--viewport-bg-day` | `#EAE5DC` | — | Three.js procedural street daylight sky/fog |
| `--viewport-bg-night` | `#0B0D10` | Subtle dot-matrix grid overlay optional on load | Obsidian 3DGS / solar-lighting viewport canvas (Nothing-inspired) |

### 1.3 Brand & Active Upgrade Accents
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--accent-civic-green` | `#1B6E2D` | Primary engineering & civic-upgrade actions, progress bars, household impact KPIs (Quietwork) |
| `--accent-signal-green` | `#10B954` | Active toggle indicator, "Fix On" state, live Aholo Viewer active dot (Ctrl) |
| `--accent-lagoon` | `#0F4C4C` | Active mode pill (`Lux3D Upgrade`), active camera preset pill |
| `--accent-terracotta` | `#C85A32` | Lagos architectural warmth, "Drop New Pin" CTA, primary marker highlight |

### 1.4 Semantic Hazard & Pin Category Tokens
| Category | Badge Fill | Pulse / Dot Color | Meaning |
| :--- | :--- | :--- | :--- |
| **Flooding** / **Open Drain** | `#0F4C4C` | `#0EA5E9` | Storm runoff & drainage channel interventions |
| **No Streetlight** / **Dark Alley** | `#D9822B` | `#F59E0B` | Off-grid solar LED streetlamp interventions |
| **Waste Overflow** | `#C85A32` | `#E1262D` | High-urgency refuse / culvert blockage (Nothing-style surgical red dot) |
| **Flooded Walkway** | `#1B6E2D` | `#10B954` | Elevated pedestrian bridge / boardwalk |
| **Custom Upgrade** | `#5B21B6` | `#8B5CF6` | Resident-authored Lux3D `G1-Turbo` prompt asset |

---

## 2. Typography Scale

Pair **Plus Jakarta Sans** (or **Inter**) for crisp geometric UI hierarchy with **JetBrains Mono** (`font-variant-numeric: tabular-nums`) for all civic budgets, coordinates, and technical telemetry.

### 2.1 Font Families (Next.js `next/font/google` + Tailwind v4 `@theme`)
- `--font-sans`: `Plus Jakarta Sans` (weights `400, 500, 600, 700, 800`)
- `--font-mono`: `JetBrains Mono` (weights `400, 500, 600, 700`)

### 2.2 Type Scale
| Role | Family | Size / Line-Height | Weight & Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | Sans | `clamp(2rem, 4vw, 3.25rem)` / `1.08` | `800` · `-0.03em` | Landing hero headline (`/`) |
| **Section Heading** | Sans | `1.5rem–1.875rem` / `1.2` | `700` · `-0.02em` | Page headers (`/upload`, Print Brief) |
| **HUD Panel Title** | Sans | `0.875rem` (`14px`) / `1.3` | `700` · `-0.01em` | `SidebarUI` header, modal titles |
| **Body / Resident Note** | Sans | `0.8125rem–0.9375rem` / `1.55` | `400–500` · `0` | Descriptions, quoted resident notes |
| **Micro Eyebrow** | Sans | `0.6875rem` (`11px`) / `1.2` | `700` · `+0.08em` (`uppercase`) | HUD section labels (`VIEW MODE`, `COMMUNITY HOTSPOTS`) |
| **KPI Metric (`₦`)** | Mono | `1.0rem–1.25rem` / `1.15` | `700` · `tabular-nums` | Deployment cost (`₦1,120,000`), households (`85`) |
| **Spatial Telemetry** | Mono | `0.6875rem` (`11px`) / `1.3` | `500` · `tabular-nums` | `[x, y, z]` coordinates, `15m` drain length, key hints (`1`–`4`, `V`), Task IDs |

---

## 3. Spatial HUD Layout Rules

### 3.1 Full-Bleed Viewport & Safe Margins
On `/explore`, the 3D canvas (`ExploreViewer`: `AholoSceneViewer` when `.splat`/`.spz`/`.ply` is present, or Three.js `SceneViewer` for the procedural street) occupies **100% of the available viewport** (`100vw` × `calc(100dvh - 56px)` beneath a compact floating/sticky top `Navbar`).

- **Desktop Safe Zone (`>= 640px`):**
  - Outer HUD margin: `16px` from all viewport edges (`top-4 left-4 bottom-4 right-4`).
  - **Left Control Rail (`SidebarUI`):** Fixed `372px` width, `max-height: calc(100% - 32px)`, internal scroll with sticky header and footer CTA.
  - **Bottom Camera Presets Bar:** Anchored inside the **open canvas region** (`left: 404px`, `right: 16px`, centered horizontally) so it never collides with `SidebarUI`.
  - **Top-Right Engine Pill:** `top: 16px`, `right: 16px` (`Engine: Aholo Viewer (3DGS)` vs `Engine: Three.js (Procedural Street)`), `pointer-events-none`.
- **Mobile Safe Zone (`< 640px`):**
  - Outer HUD margin: `12px`.
  - `SidebarUI` defaults to a compact collapsible drawer or single `44px` floating pill (`Controls (3/3)`) so the 3D street remains interactive on phones.
  - Bottom Camera Presets bar spans `left-3 right-3 bottom-3` with horizontal `overflow-x-auto` pill scrolling.

### 3.2 Border Radii & Hairline Framing
| Element | Radius | Border Rule |
| :--- | :--- | :--- |
| Floating HUD Panels & Modals | `16px` (`rounded-2xl`) | `1px solid rgba(17, 19, 18, 0.12)` + `inset 0 1px 0 rgba(255, 255, 255, 0.65)` |
| Inner Hotspot Cards & KPI Tiles | `12px` (`rounded-xl`) | `1px solid rgba(17, 19, 18, 0.08)` |
| Segmented Buttons & Dev Controls | `8px–10px` (`rounded-lg`) | `1px solid rgba(17, 19, 18, 0.10)` |
| Top Nav Capsule, Presets, 3D Pins | `9999px` (`rounded-full`) | `1px solid rgba(255, 255, 255, 0.72)` (light) / `rgba(255, 255, 255, 0.18)` (dark) |

### 3.3 Micro-Elevation & Contrast Over Textured 3DGS Scans
To guarantee `>= 4.5:1` legibility over high-frequency corrugated roofs, water puddles, and Gaussian splats:
- **Glass Backdrop:** `backdrop-filter: blur(20px) saturate(140%)`.
- **Dual-Shadow Stack:** `box-shadow: 0 12px 32px -8px rgba(10, 12, 11, 0.22), 0 2px 6px rgba(10, 12, 11, 0.08)`.
- **3D `<Html>` & Projected Pin Markers:** Always render on a solid/high-opacity pill (`rgba(255, 255, 255, 0.92)` unselected; `rgba(15, 76, 76, 0.96)` selected) with a `1px` crisp rim rather than bare floating text.
- **Print Override (`@media print`):** Hide all HUD panels, top nav, footer, and WebGL canvases (`print:hidden`); render `PrintablePlannerBrief` on `#FFFFFF` with `#111312` text and `1px solid #D5D8D4` table rules.

---

## 4. Interactive States & Motion Curves

All UI transitions prioritize crisp, mechanical responsiveness inspired by hardware/CAD tooling:

| Interaction | Curve & Duration | Visual Behavior |
| :--- | :--- | :--- |
| **Segmented Mode Switch (`Current Reality` ↔ `Lux3D Upgrade`)** | `220ms cubic-bezier(0.22, 1, 0.36, 1)` | Active pill snaps cleanly; semantic status dot shifts `#C85A32` → `#10B954`. |
| **Hotspot Card & Pill Hover** | `150ms cubic-bezier(0.22, 1, 0.36, 1)` | Border opacity increases (`0.10` → `0.26`), surface alpha lifts `+0.08`, subtle `-1px` shadow crispness. |
| **Button Press / Tactile Click** | `100ms ease-out` | `transform: scale(0.98)` on `:active` for camera presets, `Drop New Pin`, and export buttons. |
| **Pulsing 3D Street Markers** | `1.8s cubic-bezier(0, 0, 0.2, 1)` infinite | Outer status ring scales `1 → 2.1` and fades `0.75 → 0`; selected marker holds `scale(1.05)` with `#F5C563` / `#10B954` ring. |
| **Lux3D Prop Pop-In (`SceneViewer`)** | Frame-rate independent lerp (`dt * 9`) | Props smoothly interpolate scale `0.001 → modelScale` when toggling `Lux3D Upgrade` or dropping a new pin. |
| **Camera Preset Glides (`1`–`4`)** | Frame-rate independent lerp (`dt * 4.5`) | Smoothly interpolates `camera.position` and `controls.target`; immediately yields to user pointer/wheel input on drag start. |
