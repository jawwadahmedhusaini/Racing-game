# Play from a web link

APEX RUSH is a static browser game. GitHub Pages can serve its HTML, JavaScript, models and other assets directly; visitors need a modern browser with hardware acceleration, and do not need Python or the ZIP.

## GitHub Pages activation

The production site is prepared for the `gh-pages` branch in `jawwadahmedhusaini/Racing-game`.

1. Open https://github.com/jawwadahmedhusaini/Racing-game/settings/pages while signed in as the repository owner.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose **gh-pages** and **/ (root)**, then click **Save**.
4. Wait for GitHub's deployment to complete. The Pages settings will show its status and the published address.

The expected address is **https://jawwadahmedhusaini.github.io/Racing-game/**. It becomes playable after Pages is enabled and deployment succeeds. Share that address with players. Browser-local saved progress from the downloadable edition does not transfer automatically to the new site origin.

The connection used to prepare the site supports Git pushes but cannot access the GitHub Pages settings API. The repository owner must perform the activation step above. Uploading the branch by itself does not prove the site is live.

## Rebuild

From the editable source:

```sh
npm ci
npm run build:pages
```

Publish the **contents** of `dist-pages/` at the root of `gh-pages`. It includes `.nojekyll`; GitHub can serve the prebuilt site without interpreting it as a Jekyll project. Models, HDR and license links use Vite's configured base path, and Vite rewrites the HTML/CSS asset paths. Keep the existing `main` ZIP download when updating the site branch.

To validate before publishing, serve `dist-pages` mounted at `/Racing-game/`, then run `GAME_URL=<local-test-origin>/Racing-game/ node scripts/verify-hosting.mjs`. This checks both models, HDR, fonts/track images, the license link, real keyboard acceleration, pause, and page/resource errors. It writes `artifacts/hosting-smoke.json`.

If hosting at a domain root with another static host, use `npm run build` and deploy `dist/` instead. No backend, database, credentials or third-party runtime asset service is required. Hosting does not add multiplayer or cloud-synchronized saves.
