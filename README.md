# Intent First

**Browse with a purpose. Reflect in your own words. Leave with a next step.**

**[⬇ Download for Chrome — installation ZIP](https://github.com/chenfandanfangfarendechuxian-ctrl/intent-first/releases/latest/download/intent-first-chrome.zip)** · [Installation steps](#install-in-chrome)

No coding or build tools needed. English and Chinese are included in the same download.

[中文介绍](README.zh-CN.md) · [Why I built it](docs/why-intent-first.md) · [Privacy](PRIVACY.md) · [Testing](VALIDATION.md)

Intent First (醒一下) is a small Chrome extension for **X / Twitter and Douyin** (a short-video app in mainland China) **on the web**. It adds a moment of reflection to an otherwise endless feed: decide what you came for, notice what you actually took away, and return to something you want to do.

The interface runs in **English and Chinese**, with English as the default; pick your language in the popup, settings, or demo.

> "This might be useful" is not the same as "This helps what I came here to do."

![Starting a visit with a purpose, stopping rule, and next action](docs/images/start.png)

## Install in Chrome

This is an early, unpacked extension. It is **not currently listed in the Chrome Web Store**.

1. **[Download `intent-first-chrome.zip`](https://github.com/chenfandanfangfarendechuxian-ctrl/intent-first/releases/latest/download/intent-first-chrome.zip)**. This is the ready-to-install package; you do not need the source code.
2. **Extract the ZIP.** Keep the extracted **`intent-first`** folder somewhere permanent, such as Documents. Chrome loads the extension from this folder, so keep it after installing.
3. Copy **`chrome://extensions`** into Chrome's address bar and press Enter.
4. Turn on **Developer mode** in the top-right corner, then click **Load unpacked**.
5. Select the **`intent-first` folder that contains `manifest.json`**. Select the folder, not the ZIP or an individual file.
6. Open the extension from Chrome's puzzle-piece menu, choose **Notes & settings**, and select English or 中文. Refresh any X or Douyin pages you already had open.

The folder to select looks like this:

```text
intent-first/           ← Select this folder in Chrome
├── manifest.json
├── content.bundle.js
├── popup.html
└── ...
```

**Which download should I choose?** Use **`intent-first-chrome.zip`** above. GitHub's **Source code (zip)**, **Source code (tar.gz)**, and **Code → Download ZIP** are the full developer project. If you already downloaded that project, select its **`extension`** folder instead.

**“Manifest file is missing or unreadable”?** Extract the ZIP first, then open the folder you selected: `manifest.json` must be directly inside it. If there is another folder inside, open that folder and check again.

To try the flow before installing, open `demo.html` inside the installation folder. It uses fictional content and temporary in-memory notes; it does not write to your actual note collection.

**Updating an existing installation:** replace the files inside the same installed folder, click **Reload** for Intent First on `chrome://extensions`, and refresh your X / Douyin pages. Copy any unsaved text before refreshing.

## How it works

### 1. Give the visit a purpose

Write what you want to find and choose a 5-, 10-, or 20-minute budget. For repeat visits, save a **task card** with:

- **Purpose:** Learn one photography technique.
- **Stopping rule:** Understand one technique and choose an exercise.
- **Next action:** Go take one photo.
- **Time budget:** Five minutes.

Choose the card next time to fill everything at once. You can also explicitly choose to take a break.

### 2. Pause at a natural boundary

On **X**, the extension prompts after a batch of 5, 10, or 15 posts enters the reading area. A post being counted means it was visible, not that you read or understood it.

On **Douyin**, it can prompt near the end of a video or when you move to another one. An additional timed reminder provides a fallback when a site's player or layout makes detection unreliable.

![Reflection choices after a batch of posts](docs/images/reflect.png)

### 3. Say what it meant to you

Choose a description that fits:

- Relevant to my goal — I can explain how it helps.
- Learning or exploring — I do not need an action yet.
- Taking a break — no takeaway required.
- Not sure yet — an honest answer is enough.

For goal-related notes, add your own takeaway, the goal or activity it relates to, and one small next step. That might be solving a practice question, checking another news source, trying a hobby technique, or starting a work draft. Reusable presets help with common goals and actions; your reflection stays in your own words.

### 4. Decide whether to continue

**Skip this one** dismisses only the current reflection. **Pause all reminders for 5 minutes** deliberately pauses reminders and post counting. When the pause expires and the page is active again, the extension prompts you to decide what comes next.

If you gave this visit a **stopping rule**, the reflection also offers **I have enough. Take the next step.**, which opens your task's next action with a simple ten-minute focus timer. The stopping rule is optional; leave it blank and that shortcut does not appear.

These are voluntary boundaries. Intent First is a reminder, not a hard blocker.

## Who it is for

Anyone who sometimes opens a feed for one reason and keeps scrolling for another: students looking up an explanation, people exploring a hobby, readers following the news, someone planning a trip, or anyone who wants a deliberate break. You do not need a business or a productivity goal to use it.

## Why I built it

I would open a feed to understand a news story, find a tutorial, or take a short break. Later I was still scrolling, long after the reason I came had slipped out of view. I would tell myself I was learning. Sometimes I was — and sometimes that explanation just made it easier to keep going.

I wanted a small tool that helps me notice which of the two is happening. [The longer version is here.](docs/why-intent-first.md)

## Notes, actions, and AI

Notes stay in the current browser profile. You can mark an action as tried and export your notes as JSON.

You can also export an **AI-ready brief**: your notes plus instructions to preserve your meaning, question vague takeaways, distinguish source claims from your judgment, and propose a few small experiments.

There is **no AI API connection, automatic summary, video transcription, or automatic publishing**. Exporting a file does not send it anywhere. You decide whether to give it to an AI service later.

## Privacy and permissions

- No account, analytics, telemetry, advertising, or developer-operated server.
- Uses Chrome's `storage` permission and content scripts limited to Douyin, X, and Twitter domains.
- Saved notes may contain a page title, URL, your reflection, task information, and available post text. Full videos are not captured.
- Settings, task cards, presets, and notes are stored locally in the extension. Temporary per-tab state is stored in browser session storage.
- No cloud sync. Export anything you want to keep before uninstalling.

Read the [privacy details](PRIVACY.md).

## What to expect from an early version

Platform changes can break post counting or video detection. Fast scrolling, unusual players, and reused video elements are hard to handle perfectly. A feed URL may not identify the exact video you saw.

Time and counts are approximate signals. They do not prove attention, comprehension, or productivity. Sessions are per tab rather than one shared budget across all tabs. You decide whether a stopping rule has been met; the extension does not evaluate that with AI.

English UI support does **not** add support for TikTok, YouTube, Instagram, or mobile apps. The supported surfaces are currently X / Twitter and Douyin websites.

This project has not been shown to improve productivity or mental health in a controlled study. It is a practical experiment in making browsing more deliberate.

## Development

Requires Node.js 20 or newer.

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

On macOS, the tests use installed Google Chrome by default. Set `CHROME_PATH` to test with another Chromium executable. On other platforms, they use Playwright's Chromium.

- `src/`: editable application source, written in Chinese.
- `locales/en.json`: English interface translations.
- `scripts/build.cjs`: creates the bilingual bundles and checks for untranslated UI fragments.
- `extension/`: generated files ready for Load unpacked; no third-party runtime dependencies or remotely loaded code.
- `tests/`: synthetic feed, reflection, task-card, language, persistence, and recovery checks.

### How the bilingual build works

The source is written in Chinese. At build time every Chinese string literal is rewritten into `__mfL(zh, en)`, where the English side comes from `locales/en.json`, and the bundle picks a side at runtime from the stored language. The build fails if any Chinese fragment reaches the output untranslated.

Two consequences worth knowing before you contribute:

- **Add new Chinese UI text to `locales/en.json` in the same commit**, or `npm run build` will exit with the untranslated fragments listed.
- **Keep language-independent identifiers separate from display labels.** Store stable codes for categories, sources, and dismissed built-in presets, then translate their labels for display. User-written notes and task text stay exactly as entered. Existing records and readable reminder reasons are not automatically translated when switching languages.

The version number comes from `package.json`. `scripts/build.cjs` writes it into the generated manifest and exposes it to the bundles as `__mfVersion`; nothing else should hard-code it.

The screenshots use sample data. Automated feed tests do not guarantee compatibility with every live-site layout. See [validation notes](VALIDATION.md).

## Feedback

If a reminder fails, please include your browser version, extension version, supported site, selected reminder settings, and the steps that led to the issue. Avoid posting private notes, account details, or screenshots containing personal information.

The most useful question for this project is simple: **Did it help you notice when you stopped doing what you came to do?**

## License

[MIT](LICENSE).
