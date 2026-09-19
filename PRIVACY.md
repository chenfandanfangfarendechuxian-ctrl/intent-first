# Privacy

Intent First has no developer-operated server, analytics, advertising, account system, or remote AI connection.

## What the extension reads

Content scripts run only on the Douyin, X, and Twitter hosts listed in `extension/manifest.json`. They inspect rendered post elements, post links and text, visible video elements and their playback state, page titles, and URLs to detect reflection boundaries and associate a saved note with a source.

Post text captured for a note is limited to 2,000 characters per post. A batch may contain multiple posts. The extension does not capture complete videos, passwords, or unrelated websites. It does not request microphone, camera, browsing-history, or all-sites access.

## Where data is stored

Your saved reflections, source metadata, goals or activities, next steps, settings, task cards, presets, and language choice are kept in `chrome.storage.local` in the current browser profile. Per-tab browsing sessions and temporary handoffs to the focus page use `chrome.storage.session`.

Reading a feed can temporarily collect post links and excerpts into the current in-memory batch before you choose whether to save a reflection. Clicking Save writes the note to local extension storage. Demo notes are held only in memory for the current demo visit.

## Export and deletion

Export creates a file you control. The extension does not upload that file. If you provide it to an AI service or publish it yourself, that is a separate action governed by the destination's practices.

You can delete individual notes and presets through the interface. Removing the extension removes its local extension data. Export anything you want to keep before uninstalling. Chrome profile or device backup tools may separately back up local data.

## Important limits

Local storage is not an encrypted vault. Anyone with access to your unlocked browser profile may be able to view the notes. Source links and excerpts may be private or personal; check exports before sharing them.

A saved link from a recommendation feed may point to the feed rather than a permanent URL for the exact video. No cloud sync is provided.
