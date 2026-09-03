# The Stargazer's Ledger

A small incremental game about forbidden knowledge, fraying sanity, and the things that patiently wait beneath the waves.

Gaze into the sigil to gather Insight. Spend it on candles, tomes, cultists, and stranger acquisitions that gather Insight for you while you're away. Watch your Sanity — low Sanity sharpens your mind's grip on the impossible (a production bonus) but frays the edges of the page. When you've read enough to no longer survive as yourself, dissolve the self and begin again, a little steadier, with the favor of Old Blood carried forward.

**[Play it here](#)** — GitHub Pages URL added after first deploy.

## Running locally

No build step, no dependencies. Just open `index.html` in a browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How it works

- `index.html` — page structure
- `style.css` — visual design (an occult ledger: parchment ink, candle-green glow, a sigil that watches back)
- `game.js` — all game logic: resources, buildings, upgrades, sanity, prestige ("The Awakening"), and autosave to `localStorage`

Progress saves automatically to your browser's local storage. Nothing is sent anywhere; there's no backend.

## License

MIT — see `LICENSE`.
