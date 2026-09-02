# docker/

Skeleton shipped with the spec-driven template. A starting point to adapt at
bootstrap step 10, not a working configuration: replace every `CHANGEME` and
verify every pinned version.

This folder and `.devcontainer/` are the only code the template ships.
Everything else is instructions, because everything else is genuinely
project-specific.

## Two stacks, never one

| | Development | Production |
|---|---|---|
| File | `docker-compose.dev.yml` | `docker-compose.yml` |
| Image | plain `node:22-bookworm` | built from `Dockerfile` |
| Source | bind-mounted, live | baked into the image |
| Port | `127.0.0.1:3000` | not published; Caddy proxies |
| Database | named volume `dev_data` | named volume `data` |
| Started by | VS Code, via `.devcontainer/` | `docker compose up -d` |

They are separate stacks with different `name:` values, not a base and an
overlay. Compose prefixes volume names with the project name, so the two
databases can never be the same volume — a dev migration must not be able to
reach production data.

The plain filename is production. Forgetting a flag gives you production
config; the reverse convention, an auto-loaded `docker-compose.override.yml`,
means forgetting a flag silently runs dev config on a server.

## Development happens in a container

Nothing is installed on the host — no Node, no pnpm, no Prisma CLI. Open the
repository in VS Code and choose **Reopen in Container**. The terminal, the
extensions and every command the agents run are inside it.

That last part is a requirement, not a preference. `@tester` runs `pnpm test`
and `@committer` runs `pnpm lint`; if those are dispatched from a shell
outside the container, the commands do not exist. Run Claude Code from the
container's terminal.

**Keep the repository off any synced folder.** OneDrive, Dropbox and iCloud
will sync `node_modules` and `.next` continuously, and a sync client that
touches a live SQLite file corrupts it.

`node_modules` lives in a named volume that deliberately shadows the source
bind mount. On Docker Desktop, thousands of small files crossing the
filesystem translation layer is the difference between a fast install and a
painful one, and it keeps Linux binaries off the host.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production build. Runtime runs as `node`, carries no dev dependencies, uses Next's standalone output. |
| `docker-compose.yml` | Production. One `app` service, no database service, no proxy service. Joins the external network the existing Caddy instance runs on. |
| `docker-compose.dev.yml` | Development. Used by `.devcontainer/devcontainer.json`. |
| `entrypoint.sh` | Applies `prisma migrate deploy`, then starts the server. |
| `restart.sh` | Restarts the container. No build, no migration, nothing written to the database. |
| `update.sh` | Backs up the database, aborts if that fails, then builds, recreates and waits on `/api/health`. |

`.dockerignore` and `.env.example` stay at the repository root. Docker
resolves the first against the build context, and Next.js loads `.env` from
the project root, so an example placed here would be copied where nothing
reads it.

## Where the database lives

A named volume, in both stacks. The rule is the ordinary one: bind-mount
source code you are editing, and use a named volume for data that just has to
survive.

It is also the safer choice here. SQLite file locking is reliable in a named
volume on every host, including Docker Desktop, where a bind mount goes
through a filesystem translation layer that does not carry locking faithfully
— and an unreliable lock corrupts a database rather than raising an error.
Nothing on the host can reach the live file either: no sync client, no backup
agent, no stray script.

Backups still land on the host. `update.sh` runs `sqlite3 ".backup"` inside
the container, the only consistent way to copy a live SQLite file, then
extracts the snapshot with `docker compose cp`. That is what makes the file
available to your own backup rotation, not the volume type.

To inspect the live database:

```sh
docker compose exec app sqlite3 /data/app.db
```

## Placeholders

- `docker-compose.yml`: compose project name, image name, external Caddy
  network name.
- `docker-compose.dev.yml`: compose project name.
- `.devcontainer/devcontainer.json`: the container name.
- `Dockerfile`: `NODE_VERSION`, matching `package.json` `engines` and `.nvmrc`.
- `next.config` must set `output: "standalone"`, or the last `COPY` of the
  runtime stage has nothing to copy.
- `entrypoint.sh`: verify the Prisma CLI path against the version you pinned.

## Operating

```sh
cd docker
docker compose up -d     # first start
./restart.sh             # restart, nothing else
./update.sh              # back up, build, recreate, verify
```

`update.sh` reads `BACKUP_DIR`, `BACKUP_KEEP` and `DB_PATH`, each with a
default. Neither script runs a destructive Docker command — no `down -v`, no
volume removal, no image pruning. Removing the volume deletes the database,
and a script run monthly must not be one flag away from that.
