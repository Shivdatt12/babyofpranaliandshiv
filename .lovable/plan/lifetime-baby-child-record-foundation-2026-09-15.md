# Lifetime Baby & Child Record Foundation

## Goal
Evolve the existing app into a permanent 15–20 year record without replacing current trackers, duplicating events, changing calculations, or redesigning daily workflows.

## What will be built

### 1. Permanent baby identity
- Give the existing family baby record a stable permanent baby ID.
- Link existing care, medicine, doctor, vaccine, milestone, timer, and name records to that baby while retaining their current family links and IDs.
- Backfill every existing row safely; no history is recreated, moved, or deleted.

### 2. Extensible lifetime records
- Add one structured record foundation for new growth, health-history, life-event, and important-event modules.
- Store category, event type, actual event date/time, title, notes, author, source, structured details, timestamps, and optional archive state.
- Allow custom life events now, including optional photos, without copying existing tracker or milestone records.
- Keep existing daily-care tables authoritative; Timeline, Reports, Journey, and Records views will reference them rather than create duplicates.

### 3. Secure medical document vault
- Add private document metadata linked to the same baby and family.
- Support image/PDF upload, original document date, title, category, note, download/view, and delete.
- Reuse the existing private family media storage and family-only access rules; no public document URLs.

### 4. Records area
- Add a dedicated Records area reached from Profile/More, leaving the Dashboard unchanged.
- Use clear sections for Health Record, Growth & Development, Life Events, Memories, and Documents.
- Health Record will summarize and link to actual recorded vaccines, medicines, doctor visits, bilirubin, growth, prescriptions, and documents; empty categories will say nothing has been recorded.
- Growth will reuse existing weight history and support future height, length, head circumference, and other measurements through the new record model.
- Memories remain separate and continue to use the existing Album.

### 5. Unified lifetime history and search foundation
- Add a paginated lifetime history that merges existing entries, milestones, appointments, vaccines, memories, documents, and new lifetime records at read time.
- Sort and group strictly by actual event date/time, newest first, with stable ID tie-breaking.
- Add date/category filters and text search across titles, notes, types, and structured details.
- Keep Baby Day Journey today-focused and keep the current Timeline behavior intact while sharing the same canonical record adapters.

### 6. Performance and continuity
- Add family/baby/date/category indexes for long-term queries.
- Fetch lifetime history in pages rather than loading years of history at once.
- Keep the current recent synced cache and offline queue for existing features; extend both to new life events and document metadata.
- Preserve backup/restore and include the new records without changing old backup compatibility.
- Use archive support for new important records; do not silently delete or expire history.

## Technical details
- Database migration will be additive: stable baby ID, backfilled baby references, new `lifetime_records` and `medical_documents` tables, grants, family-scoped row security, update triggers, and efficient indexes.
- Existing table IDs and JSON payloads remain unchanged, so current tracker code, reminders, calculations, realtime updates, reports, and edits continue working.
- New records use actual occurrence timestamps independently from creation/update timestamps.
- Document files stay under the existing family-scoped private storage path; the database stores only metadata and object paths.
- Shared adapters will classify existing sources into Daily Care, Health, Growth, Milestone, Memory, Document, and Life Event without writing duplicate rows.

## Verification
- Confirm all pre-existing counts and representative records remain unchanged after migration.
- Verify family access rules prevent cross-family reads and writes for both new tables and storage paths.
- Test custom life-event creation/edit/archive, document image/PDF upload/view/delete, and two-parent realtime updates.
- Confirm lifetime history pagination, filters, search, descending actual-time order, and stable ordering.
- Regression-check sign-in/out, roles, reminders, breast/sleep timers, formula, pee, potty, vaccines, medicines, doctor, weight, bilirubin, album, Timeline, Baby Day Journey, Insights, Reports, backup/restore, offline queue, and mobile light/dark layout.
