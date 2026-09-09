# Baby Day Journey

## Goal
Add a compact, premium “Baby Day Journey” to the existing dashboard using only the family’s already-loaded entries, milestones, settings, and active timers. No new records, storage, tracking actions, or duplicate state will be introduced.

## What will change
- Add the journey directly below “Right Now” and keep the rest of the dashboard intact.
- Show existing active breastfeeding and sleep sessions first with a LIVE state, start time, attribution, and continuously updating elapsed time. These will reuse the current shared timers and existing Stop actions.
- Build today’s journey from actual event timestamps, sorted chronologically and grouped only when populated: Morning, Afternoon, Evening, and Night.
- Support the existing recorded types: breastfeeding, formula, pee, potty, sleep, medicine, vaccine, weight, bilirubin, doctor visits, album moments, and achieved milestones.
- Show each moment’s time, icon, title, useful recorded details, and parent attribution. Breastfeeding estimates will use the saved family ml/min setting.
- Add a compact actual-data summary for feeds, sleep, pee, and potty.
- Keep the dashboard concise by showing a limited number of moments, with “View full day →” opening the existing Timeline prefiltered to Today.
- Make each moment open its existing tracker page; no new detail, edit, or delete flow will be created.
- Add restrained entry, pulse, and tap feedback while respecting reduced-motion preferences and the current light/dark theme.

## Technical details
- Create a small memoized journey derivation module that maps existing entries and achieved milestones into display-only journey items. IDs remain tied to their source records so no duplicate records are possible.
- Reuse the existing timeline event description rules where practical, including configured breastmilk estimation and event-specific details.
- Add validated Timeline search state so the dashboard link can select Today without changing Timeline’s existing filters or history behavior.
- Keep all calculations local over the already-synced store; cloud realtime and offline replay continue to update the same source arrays and timers.

## Verification
- Check chronological order and day-period grouping using actual event timestamps.
- Check active breastfeeding/sleep rendering and Stop behavior through the existing timer implementation.
- Check add/edit/delete-driven rerendering, no duplicate item IDs, configured breastmilk values, and the Today Timeline link.
- Test phone and desktop widths, light/dark styles, refresh/reopen behavior, and browser console errors.
- Where two authenticated sessions are available, verify parent-to-parent realtime updates; otherwise verify that the journey remains directly subscribed to the existing synced store and report the test limitation.
