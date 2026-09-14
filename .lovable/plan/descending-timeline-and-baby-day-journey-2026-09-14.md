# Descending Timeline and Baby Day Journey

## Goal
Show the latest recorded event first in both Timeline and Baby Day Journey, using each event’s actual occurrence timestamp and preserving all existing behavior and styling.

## Changes
- Reverse the ordering within every Timeline date group so events render latest to oldest, while keeping the newest date group first.
- Order Baby Day Journey moments latest to oldest and render its populated day-period groups in matching reverse chronological order.
- Keep active breastfeeding and sleep sessions in the existing LIVE area above completed events.
- Preserve the current item limit, summaries, links, filters, date grouping, data structures, timers, and sync behavior.

## Technical details
- Sort only by the existing event timestamp (`at`), including milestone achievement timestamps where already supported.
- Use stable ID tie-breaking when two events have the same timestamp, preventing display order from depending on database insertion order.
- Make no data, storage, calculation, navigation, notification, or visual changes.

## Verification
- Confirm Timeline shows newest dates first and newest times first within each date.
- Confirm Baby Day Journey shows the latest completed moment first, with LIVE sessions remaining above it.
- Check an event entered later with an earlier occurrence time appears according to its occurrence time.
- Verify both pages render without browser errors or horizontal overflow on the current mobile view.
