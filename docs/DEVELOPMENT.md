# :computer: Development Guide

> [!IMPORTANT]
> Mobile platforms are not supported.

This guide covers local environment setup and developer tooling.

## :clipboard: Prerequisites

Before getting started, ensure you have the following installed on your machine:

- [Git](https://git-scm.com/install/)
- [Node.js](https://nodejs.org/) (v22+)
- [pnpm](https://pnpm.io/installation)
- Text Editor: [Visual Studio Code](https://code.visualstudio.com/) is highly recommended for this project to utilize the included workspace settings and extensions.

## :dna: Clone Repository

(You may have already done this)

Clone this repository (or your fork) locally.
[How?](https://docs.github.com/repositories/creating-and-managing-repositories/cloning-a-repository)

## :key: Environment Configuration

1. **Locate the development pack folders**

   Identify the `development_behavior_packs` and `development_resource_packs` paths. You will need
   these later.

   Standard paths on Windows 11 (Minecraft version 1.21.120+):

   ```
   %AppData%\Minecraft Bedrock\Users\Shared\games\com.mojang\development_behavior_packs
   ```

   ```
   %AppData%\Minecraft Bedrock\Users\Shared\games\com.mojang\development_resource_packs
   ```

2. **Create your local environment file**

   Create a new file named `.env` in the repository root:

   ```env
   DEV_BEHAVIOR_PACKS_DIR=""
   DEV_RESOURCE_PACKS_DIR=""
   ```

   Paste the folder paths you located earlier into the double quotes.

   :warning: If you are on Windows, ensure you use forward slashes (`/`) or double backslashes
   (`\\`) in your paths to avoid errors.

   ```env
   DEV_BEHAVIOR_PACKS_DIR="C:\\Path\\To\\development_behavior_packs"
   DEV_RESOURCE_PACKS_DIR="C:\\Path\\To\\development_resource_packs"
   ```

## :package: Install Dependencies

Run the following command to install dependencies using pnpm:

```pwsh
pnpm install
```

## :zap: Build

Run the following command to create a new development build:

```bash
pnpm run build:dev
```

See [BUILD.md](./BUILD.md) for more.
