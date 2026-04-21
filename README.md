# Chorely

A self-hosted family chore and allowance tracker. Kids check off chores with one tap; parents approve them; allowances are tracked automatically with per-chore payouts plus a weekly bonus for finishing everything.

**Runs as a single Docker container on your Unraid server.** Works in any browser on iPhone, iPad, and desktop.

---

## Quick Start on Unraid

### Option A — Docker Compose (easiest)

1. **Copy these files to your Unraid server.** Put the whole `chorely/` folder somewhere like `/mnt/user/appdata/chorely-build/`. You can use SSH/SCP, the Unraid file manager, or a network share.

2. **SSH into your Unraid server** (or open a terminal from the Unraid web UI).

3. **Build and start the container:**
   ```bash
   cd /mnt/user/appdata/chorely-build
   docker compose up -d --build
   ```

4. **Open the app:** Go to `http://YOUR-UNRAID-IP:3000` in any browser.

That's it. The database lives in `/mnt/user/appdata/chorely` and survives container restarts and updates.

### Option B — Build image manually + Unraid template

1. Copy the project folder to your Unraid server as above.

2. Build the image:
   ```bash
   cd /mnt/user/appdata/chorely-build
   docker build -t chorely:latest .
   ```

3. In the Unraid web UI: **Docker tab → Add Container**. Fill in:
   - **Name:** `Chorely`
   - **Repository:** `chorely:latest`
   - **Network Type:** `Bridge`
   - **Port:** Container `3000` → Host `3000`
   - **Path:** Container `/data` → Host `/mnt/user/appdata/chorely` (Read/Write)
   - **Variable:** `TZ` = `America/Chicago` (or your timezone)

   Alternatively, import the `chorely-unraid.xml` template from this folder: copy it to `/boot/config/plugins/dockerMan/templates-user/`, then use **Add Container → Template → User templates → Chorely**.

4. Click **Apply**. Visit `http://YOUR-UNRAID-IP:3000`.

---

## First Login

The app seeds itself with your family the first time it runs:
- **Parents:** Tanner, Kelsey — default PIN `1234` for both
- **Kids:** Stella, Axel, Nixon — no PIN needed, they just tap to enter

**Change the parent PINs immediately:** sign in as a parent → Manage tab → Change PIN.

Kids skip the PIN entirely and go straight to their dashboard with one tap.

---

## Updating

When you want to push a new version:

```bash
cd /mnt/user/appdata/chorely-build
# pull or replace your source files, then:
docker compose up -d --build
```

Your data in `/mnt/user/appdata/chorely` is preserved.

---

## Backup

All data lives in a single file: `/mnt/user/appdata/chorely/chorely.db`. Just copy it somewhere safe. Unraid's built-in appdata backup plugin picks it up automatically.

---

## Ports & Access

- Default web port: **3000**
- To change it, edit `docker-compose.yml` (e.g. `"8080:3000"`) or set the port in the Unraid template
- For remote access over the internet, put it behind your existing reverse proxy (SWAG, Nginx Proxy Manager, etc.) — the app is just plain HTTP on one port

---

## Project Structure

```
chorely/
├── Dockerfile               # Multi-stage build, single final image
├── docker-compose.yml       # One-command deploy
├── chorely-unraid.xml       # Unraid Docker template
├── backend/
│   ├── package.json
│   └── server.js            # Express + SQLite API
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx          # All UI
        └── index.css
```

## Stack

- **Backend:** Node.js 20 + Express + better-sqlite3
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database:** SQLite (single file, no external DB needed)
- **Image:** Single Alpine-based container, ~150 MB
