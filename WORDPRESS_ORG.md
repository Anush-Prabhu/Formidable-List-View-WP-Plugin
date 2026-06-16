# WordPress.org submission

## Before you submit

1. **WordPress.org account** — https://login.wordpress.org/register  
2. **Update `readme.txt`** — set `Contributors:` to your **wordpress.org username** (currently `anushprabhu` — change if different).  
3. **Optional assets** — add to `.wordpress-org/` before SVN upload:
   - `icon-128x128.png`, `icon-256x256.png`
   - `banner-772x250.png`, `banner-1544x500.png` (retina)

Screenshots `screenshot-1.png` and `screenshot-2.png` are already in `.wordpress-org/`.

## Step 1 — Build submission zip

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-release-zip.ps1
```

Upload `formidable-list-view-1.0.13.zip` at:

**https://wordpress.org/plugins/developers/add/**

Review usually takes **3–10 business days**.

## Step 2 — After approval (SVN)

Replace `your-plugin-slug` with the slug WordPress assigns (likely `formidable-list-view`).

```powershell
svn co https://plugins.svn.wordpress.org/formidable-list-view/ wp-org-svn
```

Copy plugin files into `wp-org-svn\trunk\` (not the whole repo — only plugin contents, no `.wordpress-org`, `.git`, `scripts`, `.cursor`, `.github`).

```powershell
# Copy assets to SVN assets folder (sibling of trunk)
Copy-Item .wordpress-org\* wp-org-svn\assets\

cd wp-org-svn
svn add trunk/*
svn add assets/*
svn cp trunk tags/1.0.13
svn ci -m "Release 1.0.13"
```

Use your **wordpress.org** username and an [application password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) when prompted.

## Public plugin URL (after approval)

https://wordpress.org/plugins/formidable-list-view/

## License

This plugin is licensed under **GPLv2 or later** for WordPress.org compatibility.

## Guidelines

https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/

- Requires Formidable Forms — clearly stated in readme (OK)
- Not affiliated with Strategy11 — stated in readme (OK)
- No bundled Formidable code
