# OneTab Guard — Chrome Extension

> Prevent duplicate tabs. When you open a URL whose domain is already open, Chrome will switch focus to the existing tab instead of creating a new one.

---

## Features

- **Zero duplicates** — navigating to an already-open domain focuses the existing tab and closes the new one
- **Master toggle** — enable or disable the extension in one click; the toolbar icon turns grey when off
- **Two modes**
  - `All Domains` — applies to every domain *except* those you blacklist
  - `Whitelist Only` — applies *only* to domains you explicitly add
- **Two match strategies**
  - `Hostname` — any path on the same host (e.g. `web.whatsapp.com/*`)
  - `Full URL` — exact URL must match before redirecting
- **Whitelist & Blacklist** — manage both lists from the popup; changes take effect instantly
- **Smart input** — paste a full URL and it auto-strips to the hostname
- **Parent-domain matching** — adding `whatsapp.com` also matches `web.whatsapp.com`
- **Conflict guard** — prevents the same domain from being in both lists
- **No external dependencies** — pure HTML/CSS/JS, no build step required

---

## Screenshots

| Popup — All Domains mode | Popup — Whitelist Only mode |
|---|---|
| ![all-domains](docs/screenshot-all.png) | ![whitelist](docs/screenshot-whitelist.png) |

---

## Installation (Developer / Unpacked)

> Use this method to run the extension locally without publishing it.

1. **Clone the repo**
   ```bash
   git clone https://github.com/qusaieilouti99/single-tab-chrome-extension.git
   cd single-tab-chrome-extension
   ```

2. **Open Chrome Extensions page**
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** — toggle in the top-right corner

4. **Click "Load unpacked"** and select the cloned folder

5. The **OneTab Guard** icon will appear in your toolbar — click it to configure

---

## Usage

### Modes explained

| Mode | Behaviour |
|---|---|
| **All Domains** | Every domain is single-tabbed **unless** it's in the Blacklist |
| **Whitelist Only** | Only domains in the Whitelist are single-tabbed; everything else is unrestricted |

### Match strategies explained

| Strategy | Example |
|---|---|
| **Hostname** | Already have `web.whatsapp.com/chat` open → opening any `web.whatsapp.com/*` redirects you |
| **Full URL** | Only redirects if the *exact* URL is already open in another tab |

### Tips

- Add `whatsapp.com` (without subdomain) to match *all* subdomains of WhatsApp
- Use **Blacklist** in `All Domains` mode to carve out exceptions (e.g. `localhost`, `github.com`)
- Use **Whitelist Only** mode for a minimal, opt-in experience
- Press `Enter` to quickly add a domain without clicking the button
- Paste a full URL like `https://mail.google.com/mail/u/0/` — it auto-extracts `mail.google.com`

---

## Project Structure

```
single-tab-chrome-extension/
├── manifest.json   # Extension manifest (Manifest V3)
├── background.js   # Service worker — tab deduplication logic + icon generator
├── popup.html      # Popup UI structure
├── popup.css       # Popup styling
└── popup.js        # Popup UI logic
```

### How it works

```
User opens new tab
       │
       ▼
background.js (chrome.tabs.onUpdated)
       │
       ├─ Extension disabled?  ──► do nothing
       │
       ├─ Domain in Blacklist? ──► do nothing
       │
       ├─ Mode = Whitelist Only AND domain not in Whitelist? ──► do nothing
       │
       └─ Find existing tab with same hostname / URL
               │
               ├─ Found ──► focus existing tab → close new tab
               └─ Not found ──► do nothing (new tab stays open)
```

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `tabs` | Read URLs of open tabs, switch focus, and close duplicates |
| `storage` | Save whitelist, blacklist, and settings so they persist across sessions |

No browsing history is collected. No data is sent anywhere. Everything stays local.

---

## Contributing

Pull requests are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes
4. Open a PR

---

## License

MIT — see [LICENSE](LICENSE) for details.
