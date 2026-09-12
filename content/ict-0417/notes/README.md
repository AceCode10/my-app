# IGCSE ICT 0417 notes

The published revision notes for Information and Communication Technology (0417),
written against the **2026, 2027 and 2028** syllabus.

One HTML file per topic. The files hold the note **body only** - no `<html>`,
`<head>`, `<body>`, `<style>` or `<script>`. They are stored in the `notes` table
as `rendered_html` and drawn by `HtmlNoteRenderer`
(`src/components/notes/html-note-renderer.tsx`), which supplies all the styling.

## Publishing

```bash
node scripts/import-ict-notes.js --dry-run     # report what would be written
node scripts/import-ict-notes.js               # publish
node scripts/import-ict-notes.js --only=databases
```

The script needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`. It matches each file to a topic by the start of the topic slug and
updates every note row on that topic, so duplicate rows cannot leave a stale
version showing.

## Networks and the Effects of Using Them is deliberately not here

Topic 4's note is the reference version the other topics were written to match,
and it is the note currently in production. There is no file for it, and the
script also refuses to write to that topic (`PRESERVED_SLUG_PREFIXES`), so it
cannot be overwritten by accident.

## Writing a note

`src/lib/notes/__tests__/ict-notes-content.test.ts` checks the structure of every
file, so run `npm test` after editing one.

A note is a page header followed by sections:

```html
<div class="page-header">
  <div class="section-label">Cambridge IGCSE ICT 0417 &middot; Topic 3</div>
  <h1>Storage Devices and Media</h1>
  <p>Short introduction.</p>
  <div class="note"><strong>Syllabus coverage:</strong> ...</div>
</div>

<div class="section" id="magnetic-storage">
  <div class="section-header">
    <span class="snum">3.2</span>
    <h2>Magnetic Storage</h2>
  </div>
  <div class="section-body">
    <div class="sub" id="magnetic-tape"> ... </div>
  </div>
</div>
```

The `section` opening tag, `section-header`, `snum` and `h2` must stay in exactly
that shape: the renderer parses them to build the "On this page" contents list.

### Blocks available

| Class | Use |
| --- | --- |
| `def-box` | A definition to learn by heart |
| `device-card` + `device-card-header` / `device-card-body` | One device, method or application |
| `badge badge-input` / `badge-output` / `badge-storage` / `badge-direct` | Label inside a card header |
| `uses-box` + `.label` | "Uses" list |
| `adv-dis` with `adv-box` / `dis-box` (add `full` for one column) | Advantages and disadvantages |
| `note` | Exam tip or warning |
| `table-wrap` + `comp-table` | Comparison table |
| `grid-2` / `grid-3` + `mini-card` | Side-by-side points |
| `term-list` + `details.term` | Key-word reveal |
| `check` + `details.q` + `.answer` | Self-test questions |
| `recap` | End-of-section key points or topic checklist |
| `syllabus-tag` | Small syllabus reference beside a heading |

The reveals are plain `<details>` elements, so they work without any script, and
the PDF download opens them before capturing the page.
