# Upstream feature: native List View in Formidable builder

Use this as the body for a GitHub issue (or Discussion post) to document the gap and this plugin as a reference implementation.

---

## Summary

Large **multi-page Formidable forms** are hard to manage in the visual builder alone. A **hierarchical List View / outline panel** in the Build tab would help power users navigate, search, and reorder fields without endless canvas scrolling.

## Problem

- Forms with 10+ pages and hundreds of fields are common in data-entry and government workflows
- Finding one field requires scrolling the canvas and expanding sections
- Page structure is split across rootline + canvas; there is no single outline
- Row actions (delete, duplicate, settings) are easy to miss on long forms

## Proposed core feature

A **List View** tab in the form builder sidebar that shows:

- Page → section → field hierarchy
- Search by label, field key, and ID
- Collapse to pages only; optional sync with canvas page collapse
- Click row to select field on canvas
- Inline label edit and drag reorder synced to canvas
- Row menu (⋮) aligned with canvas field actions

## Reference implementation

This repository implements the above as a third-party plugin using official hooks:

- `frm_extra_form_instruction_tabs`
- `frm_extra_form_instruction_tabs_content`
- Formidable builder JS APIs for selection, reorder, and field actions

**Repo:** https://github.com/Anush-Prabhu/Formidable-List-View-WP-Plugin  
**Stable release:** v1.0.12

## Why hooks are sufficient

The plugin does not patch Formidable core. It extends the builder the same way other sidebar tabs do. That suggests a native feature could live in core or an official add-on without breaking the extension model.

## Feedback welcome

If you use Formidable for large forms, please comment with:

1. Typical page/field counts
2. Whether an outline view would replace or complement your workflow
3. Must-have actions (search, reorder, collapse, etc.)

---

*Not affiliated with Strategy11 / Formidable Forms.*
