# Local 3D Models (`/public/models/`)

Place Aholo World and Aholo Lux3D 3D assets here so `ExploreViewer` (`AholoSceneViewer` primary + `SceneViewer` procedural fallback) loads them automatically on `/explore`:

- **Base Street 3DGS (`BASE_STREET_SPLAT_CANDIDATES` check order):**
  1. `lagos_street.spz` *(primary default — compressed Aholo World 3DGS scan)*
  2. `lagos_street.splat` *(fallback uncompressed splat)*
  3. `lagos_street.ply` *(fallback point/Gaussian PLY)*
- **Community Infrastructure Upgrades (Aholo Lux3D GLB):**
  - `solar_lamp.glb` — Off-grid solar LED streetlight pole
  - `drain_cover.glb` — Precast concrete drainage channel & slotted cover
  - `waste_hub.glb` — Covered community waste & recycling sorting hub

> `ExploreViewer` probes `BASE_STREET_SPLAT_CANDIDATES` via `HEAD` requests in priority order and mounts `AholoSceneViewer` (`@manycore/aholo-viewer`) for `.spz`/`.splat`/`.ply`/`.sog` scenes, automatically falling back to the `SceneViewer` (`@react-three/fiber`) procedural Lagos street when no local 3DGS file exists or WebGL init fails.
