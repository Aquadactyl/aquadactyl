# Public demonstration

This is a disposable Aquadactyl + Manta deployment for `https://demo.aquadactyl.uk`. Do not point it at an existing installation's database, storage, Docker socket or credentials.

The login form prefills the public `demo` account and lets visitors select `demo-admin`. Both use the deliberately public password `AquadactylDemo123!`. This does not bypass normal authentication, sessions or CSRF validation. Demo mode defaults to **off** on ordinary installations.

Visitors can browse the panel, inspect the restricted admin area, use the two real Python example containers, send their supported console commands, organise servers into folders, and edit `welcome.txt`. Admin writes, account/security changes, API/SSH keys, node credentials, uploads, startup code, image changes and addon installations are protected. These restrictions apply to HTTP requests as well as the interface. The examples are Python workloads, not simulated Minecraft servers.

## Run with Docker Compose

Set `DEMO_DB_PASSWORD` and `DEMO_DB_ROOT_PASSWORD` to different generated values, then run:

```sh
docker compose -f deploy/demo/compose.yaml up -d --build
```

Attach HTTPS ingress to **panel port 80**, with `DEMO_URL` set to the public origin. Manta's websocket and API routes use the same origin through the bundled Nginx proxy; no second hostname is needed. The database, Redis, daemon, runtime Docker API and SFTP port have no published host ports. For local testing, explicitly add a loopback-only port mapping and set `DEMO_URL` and `DEMO_SECURE_COOKIE=false` for that HTTP origin.

Dokploy can build this Compose definition from a pinned Git commit. Use a separate environment and new volumes. Configure the passwords through Dokploy's environment editor; never commit them. The `resetter` uses the same built panel image as `panel`.

## Isolation and resource limits

Manta and its example containers use a **separate rootless Docker engine**. The runtime runs as UID 1000, uses user namespaces and a TUN device, and receives no production Docker socket, privileged mode, host filesystem mount or host network. RootlessKit requires the explicit seccomp/AppArmor/system-path exceptions shown in Compose. Test host support before making the deployment public; do not replace this setup with privileged Docker-in-Docker.

The runtime has a hard outer limit of 1.5 GiB RAM, one CPU and 512 processes. The database, panel, cache and reset worker have separate limits. Per-server cgroup enforcement/accounting is limited inside this nested rootless setup, so the demo is for exploring the interface and workflow, **not production performance benchmarking**. Normal Manta deployments use their native Docker/cgroup limits.

## Five-minute resets

The reset worker restores only the dedicated `aquadactyl_demo` database and the two server UUIDs recorded in its private ownership marker. It connects to the demo runtime's Unix socket, recreates the example containers, restores their baseline files, and clears this deployment's Redis sessions/cache. Resets align to five-minute clock boundaries, matching the visible countdown. Requests receive a brief retryable response during restoration. Rebuilding restores the previous baseline before migrations, then writes a snapshot using the current schema. The application key stays stable.

To verify recovery immediately:

```sh
docker compose -f deploy/demo/compose.yaml exec resetter php deploy/demo/reset.php --once
```

Check resetter logs for `Demo restored to its baseline`, verify an edited `welcome.txt` returns to its original content, and confirm both servers return to Running. Snapshot files and deployment secrets remain in private volumes outside server storage.
