# Firework Overlay

A lightweight React + Three.js firework overlay component for celebratory UI moments.

## Features

- Lightweight `three.js`-based particle fireworks
- Transparent overlay that can sit on top of any layout
- Configurable launch timing, burst count, colors, spread, and particle density
- Works well for quiz results, rewards, success states, and festive landing screens

## Installation

```bash
npm install react three
```

## Usage

Create a `FireworkOverlay.jsx` file and paste in the component implementation.

```jsx
import FireworkOverlay from './FireworkOverlay'

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#050816',
      }}
    >
      <FireworkOverlay />
    </div>
  )
}
```

## Example With Custom Options

```jsx
<FireworkOverlay
  spawnIntervalMs={1400}
  burstCountRange={[1, 3]}
  sparkCountRange={[176, 264]}
  coreCountRange={[48, 68]}
  sparkSpread={1.95}
  colors={['#ff6b35', '#ffd166', '#ff4d6d', '#f7b267']}
/>
```

## Main Props

- `spawnIntervalMs`: delay between launch clusters
- `burstCountRange`: how many fireworks launch together
- `sparkCountRange`: outer particle count range
- `coreCountRange`: inner flash particle count range
- `sparkSpeedRange`: outer particle expansion speed
- `coreSpeedRange`: inner particle expansion speed
- `sparkSpread`: how wide the outer burst spreads
- `coreSpread`: how wide the inner flash spreads
- `colors`: palette used for launches
- `className`: wrapper class name
- `style`: wrapper inline style
- `zIndex`: overlay stacking order

## Suggested Project Structure

```text
firework-overlay/
  src/
    FireworkOverlay.jsx
    App.jsx
    main.jsx
  package.json
  README.md
  LICENSE
```

## License

MIT
