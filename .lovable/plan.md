# Photo viewing and download fix

## What will change
- Make each album photo open in a large, mobile-friendly viewer when tapped.
- Add a clear download action inside the viewer and on each photo tile.
- Keep private family access intact by downloading through the existing signed photo link.
- Preserve upload, captions, deletion, family sync, and the current visual style.

## Validation
- Verify opening and closing a photo on mobile.
- Verify the download produces the actual image with a sensible filename.
- Check existing upload and delete controls remain usable without accidental triggering.
- Confirm no console errors or horizontal overflow.

## Technical details
- Reuse the existing private media URL resolver and dialog/button components.
- Fetch the signed image URL as a blob before saving, with a direct-link fallback for browser compatibility.
- Add accessible labels and prevent photo actions from interfering with one another.
