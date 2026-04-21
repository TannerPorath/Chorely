# Deploying Chorely via Dockge

You already run Dockge on port 5001 — this is the fastest path.

## Important: port assignment
Port **3000 is already taken by your `kasm` container**, so Chorely is configured to use host port **3100** instead. You'll access it at `http://YOUR-UNRAID-IP:3100`.

## Steps

1. **Copy the source to your Dockge stacks directory.**

   SSH into Unraid and run:
   ```bash
   mkdir -p /mnt/user/appdata/dockge/stacks/chorely
   # then transfer the contents of this zip (except the zip itself) into that folder
   # e.g. via SMB share, scp, or unzip directly on the server
   ```

   The final structure should be:
   ```
   /mnt/user/appdata/dockge/stacks/chorely/
   ├── Dockerfile
   ├── docker-compose.yml
   ├── .dockerignore
   ├── backend/
   └── frontend/
   ```

2. **Open Dockge** at `http://YOUR-UNRAID-IP:5001`.

3. You should see a **`chorely`** stack appear automatically (Dockge scans its stacks folder). If it doesn't appear right away, refresh the page.

4. Click on the `chorely` stack and hit **Deploy** (or **Start**). Dockge will run `docker compose up -d --build` — the first build takes 1-2 minutes while it compiles better-sqlite3 and bundles the frontend.

5. Once it shows "running", visit **http://YOUR-UNRAID-IP:3100** in any browser.

## First-time login
- **Parents:** Tanner and Kelsey — PIN `1234` (change both in the Manage tab immediately)
- **Kids:** Stella, Axel, Nixon — just tap the avatar, no PIN

## Updating later
When you change the source code, bump something in Dockerfile, or want to rebuild:
- In Dockge: click the stack → **Update** (this does `docker compose up -d --build`)
- Or from SSH: `cd /mnt/user/appdata/dockge/stacks/chorely && docker compose up -d --build`

Data in `/mnt/user/appdata/chorely/chorely.db` survives rebuilds.

## Backups
The entire app state is a single SQLite file: `/mnt/user/appdata/chorely/chorely.db`. Your Unraid appdata backup plugin already covers it.
