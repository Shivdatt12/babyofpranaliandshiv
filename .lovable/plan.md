# Final Premium UI/UX Polish

## Direction
Apply the selected **Material tonal refinement** across the existing app: warm orange, compact, calm, low-shadow, touch-friendly, and clearly Android-native. Preserve every feature, workflow, data source, calculation, notification, sync path, and navigation destination.

## What will change
- Consolidate typography, spacing, radii, surfaces, borders, elevation, icon wells, controls, status chips, and motion into one shared design system.
- Reduce glass effects and visual noise in favor of restrained tonal surfaces and clearer information hierarchy.
- Refine the shared app bars, bottom navigation, Central Add sheet, dialogs, buttons, fields, tabs, filters, and list rows.
- Polish Dashboard order and density without adding features: baby identity and age, Right Now, Today, Care, then life and memories.
- Make active timers, due care, and primary values prominent; keep inactive states and metadata compact.
- Refine Timeline and Baby Day Journey presentation while preserving descending timestamp order, grouping, limits, links, and live sessions.
- Standardize LIVE, ACTIVE, UPCOMING, PENDING, COMPLETED, SKIPPED, MISSED, SYNCED, and OFFLINE treatments across relevant screens.
- Improve form labels, touch targets, keyboard/input types where already applicable, validation presentation, and optional-field grouping without changing saved data.
- Use structured skeleton loading and warm, useful empty states on the main data screens.
- Add one restrained motion system for page entry, sheet/dialog transitions, press feedback, state changes, timers, and success/removal feedback, with reduced-motion support.

## Technical details
- Extend semantic tokens and reusable utilities in the global design system rather than hardcoding screen-specific colors.
- Update shared primitives first so improvements flow consistently through existing routes.
- Keep Lucide through the existing centralized `FeatureIcon` mapping for functional identifiers.
- Keep the Central Add as the only global quick-entry system.
- Make presentation-only edits; no database, authentication, cloud sync, notification, calculation, or event-model changes.

## Verification
- Check all content routes on Android-sized mobile viewports in light and dark mode.
- Verify no horizontal overflow, clipped labels, overlapping navigation, or inaccessible touch targets.
- Exercise Dashboard, Central Add, Timeline filters, Journey links, representative forms, dialogs, active states, and empty/loading states.
- Confirm the authenticated app has no browser console/runtime errors and the current build is healthy.
