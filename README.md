# Slasher Sword Add-on

Minecraft Bedrock add-on that adds a powerful chainsaw-like sword!

## :package: Installation (for users)

> [!IMPORTANT]
> When downloading the add-on, do NOT download from the big green “Code” button on GitHub.
> Instead, look for a file in the "Releases" section, or other distribution websites.

### Standard

1. Download the `.mcaddon` or `.mcpack` file for your desired version
2. Open your file explorer app and find the downloaded file
3. Open the file with Minecraft to install
4. Add the installed packs to your (new) world
5. Done!

### Manually

1. Download the `.zip` file for your desired version

   > If a zip file is unavailable, download the `.mcaddon` or `.mcpack` file instead and rename the
   > file extension to `.zip` later.

2. Open your file explorer app and find the downloaded file
3. Extract the zip file
4. Locate the internal folders that will contain the packs

   You need to know where the `com.mojang` folder, and its subfolders, `behavior_packs` and
   `resource_packs` are. It heavily depends on what platform your device is on.

   Standard paths on Windows 11 (Minecraft version 1.21.120+):

   ```
   %AppData%\Minecraft Bedrock\Users\Shared\games\com.mojang\behavior_packs
   ```

   ```
   %AppData%\Minecraft Bedrock\Users\Shared\games\com.mojang\resource_packs
   ```

   > For other platforms, check [this page on Bedrock Wiki](https://wiki.bedrock.dev/guide/project-setup.html#the-com-mojang-folder)

5. Copy and paste the pack folders we extracted from the zip file

   Paste the behavior pack into the `behavior_packs` folder.

   Paste the resource pack into the `resource_packs` folder.

6. Open Minecraft and add the installed pack(s) to your (new) world
7. Done!

## :package: Installation (for developers)

Read [DEVELOPMENT.md](./docs/DEVELOPMENT.md)
