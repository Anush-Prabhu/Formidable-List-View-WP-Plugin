# Publish GitHub release

From the plugin root, after [GitHub CLI login](https://cli.github.com/manual/gh_auth_login):

```powershell
gh auth login
powershell -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
```

This script will:

1. Set repo description and topics
2. Enable Discussions
3. Build `formidable-list-view-{version}.zip`
4. Create or update the GitHub Release with notes and zip asset

Version is read automatically from `FLV_VERSION` in `formidable-list-view.php`.
