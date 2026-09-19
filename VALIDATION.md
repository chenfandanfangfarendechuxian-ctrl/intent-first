# Validation

2026-09-19T12:38:16.917Z

Automated checks use an isolated headless Chromium instance, mocked extension APIs, and synthetic X / Douyin pages. These are not a claim of comprehensive live-site compatibility.

- PASS: Background errors default to English
- PASS: Task cards survive concurrent saves and background restarts
- PASS: Retrying a save does not create duplicate notes
- PASS: A task hands its own next action to the focus page
- PASS: Background follows the selected Chinese language
- PASS: Editing presets does not freeze built-in suggestions into storage
- PASS: Built-in suggestions follow the current language
- PASS: Dismissing a built-in suggestion survives a language switch
- PASS: English is the default UI language
- PASS: English task cards save and fill all fields
- PASS: English reflection saves a note with its task context
- PASS: Reaching a stopping rule leads to the chosen next action
- PASS: Language selector switches to Chinese
- PASS: Language selector switches back to English
- PASS: Language can also be changed inside an open reflection dialog
- PASS: Preset updates in another tab retain built-in suggestions
- PASS: Settings support editing task cards and display the handed-off action
- PASS: AI export instructions and filenames are English
- PASS: Saved text is escaped and unsafe source URLs are not linked
- PASS: Generated manifest and running content script use the package version
- PASS: Compiled English script counts 5 X posts and opens a reflection
- PASS: Skipping one batch keeps the next batch reminder active
- PASS: A 5-minute pause ends with an explicit reminder
- PASS: Disconnected extension preserves the draft and offers recovery
- PASS: Compiled English script detects a video ending
- PASS: Video notes store a stable source code
- PASS: Chinese UI remains usable on a narrow viewport
- PASS: English and Chinese breaks store neutral purpose and source fields
- PASS: Notes display translated source and break labels while retaining legacy sources
- PASS: No uncaught page errors
