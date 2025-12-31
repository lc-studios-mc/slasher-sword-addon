# Build

## :test_tube: Development Build

```bash
pnpm run build:dev
```

Once it's done, you can find the output in the `build` folder.

Development build packs will be copied into the folders you specified in `.env`. Open Minecraft and
you'll see the packs being available.

There's also watch mode, which rebuilds on file changes:

```bash
pnpm run build:dev:watch
```

## :speaking_head: Release Build

```bash
# Versioning:    major minor patch
#                     \  |  /
pnpm dotenv -v VERSION=0.6.9 -- pnpm run build
```

Once it's done, you can find the output in the `build` folder.

Release build packs are not copied into the folders you specified in `.env`.
