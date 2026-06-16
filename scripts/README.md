# Maintainer scripts (optional)

These files are **for publishing the plugin on GitHub**. They are not loaded by WordPress and are not required to use the plugin.

| File | Purpose |
|------|---------|
| `build-release-zip.ps1` | Builds `formidable-list-view-{version}.zip` for WordPress upload (excludes `.git`, `.cursor`, and this `scripts/` folder). |
| `publish-github.ps1` | Uses [GitHub CLI](https://cli.github.com/) (`gh`) to set repo topics, enable Discussions, and attach the zip to a GitHub Release. |
| `PUBLISH_GITHUB.md` | Short instructions to run the publish script after `gh auth login`. |

## Security

- **No passwords, tokens, or API keys** are stored in these files.
- `publish-github.ps1` only references the **public** repo name `Anush-Prabhu/Formidable-List-View-WP-Plugin`.
- Authentication uses **`gh` on your machine** (you run `gh auth login` locally). Credentials never go into the repository.

## Why PowerShell?

This project is developed on **Windows** (XAMPP). PowerShell is built in and runs the zip/release steps without extra tools. If you prefer, you can zip the plugin manually and create a release on GitHub in the browser instead.
