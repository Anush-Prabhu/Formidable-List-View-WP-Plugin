=== Formidable List View ===
Contributors: anushprabhu
Tags: formidable, forms, form builder, list view, admin
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.15
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds a hierarchical List View tab to the Formidable Forms builder for navigation, search, inline editing, and reordering.

== Description ==

**Formidable List View** adds a **List View** tab to the Formidable Forms builder sidebar. It is built for large, multi-page forms where scrolling the visual canvas is slow and hard to navigate.

**Requires [Formidable Forms](https://wordpress.org/plugins/formidable/) 6.31 or newer.** Formidable Pro is recommended for page breaks, sections, and repeaters.

This plugin is not affiliated with Strategy11 or Formidable Forms.

= Features =

* Hierarchical tree: pages, sections, fields, repeaters, and nested forms
* Search by label, field key, or ID
* **Collapse to pages** — see ★ Page 1, Page 2, and so on at a glance
* **Sync collapse with builder** — toggle pages on the canvas rootline from List View
* Click a row to select the field on the canvas
* Inline label and visibility editing
* Drag to reorder fields within a page or section (synced to the canvas)
* Row menu (⋮): Delete, Duplicate, Field Settings, **Bulk delete** (pages and sections)

= Requirements =

* WordPress 6.0+
* PHP 7.4+
* Formidable Forms 6.31+

The plugin loads only on the form **Build** screen for users who can edit forms. It does not run on the front end.

== Installation ==

1. Install and activate **Formidable Forms** 6.31 or newer.
2. Upload the plugin zip via **Plugins → Add New → Upload Plugin**, or install from the WordPress.org directory once approved.
3. Activate **Formidable List View**.
4. Edit any form → **Build** → click the **List View** tab in the left sidebar.

== Frequently Asked Questions ==

= Does this work without Formidable Forms? =

No. An admin notice is shown if Formidable Forms is missing or older than 6.31.

= Does this change the front end of my forms? =

No. List View is a builder-only tool for site administrators and form editors.

= Does this modify Formidable core files? =

No. It uses official Formidable builder extension hooks.

= Can I reorder page breaks from List View? =

Page rows are for navigation. Reorder fields within each page or section; page breaks are managed on the canvas as usual.

== Screenshots ==

1. Full List View tree with pages, sections, field keys, and IDs
2. Collapse to pages — multi-page form overview

== Changelog ==

= 1.0.15 =
* Fix drag reorder using Formidable field order sync (moveFieldSettings + frm_sync_after_drag_and_drop)
* Improve bulk delete: sequential deletes with proper completion handling

= 1.0.14 =
* Fix List View drag reorder (canvas sync without list snapping back)
* Bulk delete for pages and sections (all nested fields)

= 1.0.13 =
* WordPress.org submission package: readme.txt, GPLv2 license, plugin assets
* Version bump for directory release

= 1.0.12 =
* Initial public release: List View tab, search, collapse, drag reorder, row menus, MIT/GPL distribution on GitHub

== Upgrade Notice ==

= 1.0.14 =
Drag reorder fix and bulk delete for pages/sections. Requires Formidable Forms 6.31+.

= 1.0.13 =
WordPress.org release preparation. Requires Formidable Forms 6.31+.
