# PLAYFORM

I built PLAYFORM as a neon-inspired arcade that runs right in the browser. It brings a 100-title game catalog together with search, category filters, favorites, score tracking, and quick-play controls—without a build step or app dependencies.

## Features

- **100 catalog entries** across Arcade, Puzzle, Action, and Casual categories. The catalog is generated from a small set of reusable game styles and mechanics, so the entries are variations rather than 100 entirely different game engines.
- **Four playable game types:** Snake, a falling-obstacle dodge game, a brick-breaker, and a tile-matching memory game.
- **Browse your way:** search by title or category, sort by popularity, name, or newest, and load more games as you go.
- **Make it yours:** favorite games and personal high scores are saved in your browser using `localStorage`.
- **Arcade presentation:** responsive dark-mode layout, neon-inspired game art, and a canvas-based play overlay.

## Run it locally

There is no build step or package installation. The simplest option is to open `index.html` in a modern browser.

To serve it locally instead, run this from the project folder:

```powershell
py -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Controls

| Game | Controls |
| --- | --- |
| Snake | Arrow keys or **WASD** to steer. Collect the glowing dots and avoid the edges and your trail. |
| Dodge | Arrow keys or **WASD** to move. Avoid the falling obstacles. |
| Brick breaker | Move the paddle with the mouse or **Left/Right** arrows (or **A/D**). Use the on-screen controls to pause or restart. |
| Memory match | Click tiles two at a time to find matching pairs. |

The game overlay includes a start button, pause and restart controls, the current score, and your saved best score for that title.

## Project files

- `index.html` — page structure and game dialog.
- `styles.css` — layout, visual styling, and responsive breakpoints.
- `games.js` — data-driven catalog of 100 game entries.
- `app.js` — filtering, favorites, storage, and canvas game logic.

The app uses plain HTML, CSS, and JavaScript. Google Fonts are loaded from the web; if they are unavailable, the page falls back to system sans-serif fonts.

## Adding catalog entries

The catalog is created in `games.js` from theme definitions. Each entry has a title, category, artwork style, and a `type` that selects one of the supported game mechanics. To add or change entries, update the themes and catalog-generation loop there; the game type must have corresponding rendering and update logic in `app.js` to be playable.
