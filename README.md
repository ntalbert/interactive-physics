# Brand Gravity Ecosystem - WebGL Background

A high-performance WebGL animated background built with Three.js, recreating the "Brand Gravity Ecosystem" visual effect.

## Features

- **Swirling Nebula**: Custom GLSL shader creating a watercolor-style vortex effect
- **Particle System**: Floating blue particles with orbital motion
- **Grid Background**: Subtle graph paper texture
- **Orbital Rings**: Concentric elliptical paths
- **Responsive**: Adapts to any screen size
- **Performance Optimized**: Pauses when tab is hidden, pixel ratio limiting
- **Fallback Support**: Video fallback for non-WebGL browsers

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
/
├── index.html      # Main HTML with canvas and UI elements
├── main.js         # Three.js scene setup and animation
├── styles.css      # Styling for overlay elements
└── package.json    # Dependencies and scripts
```

## Customization

### Colors
Edit the `CONFIG.colors` object in `main.js`:

```javascript
colors: {
  background: 0xF5F3E8,      // Cream/beige
  nebulaCore: '#4A90D9',     // Light blue center
  nebulaOuter: '#2B5797',    // Darker blue edges
  particles: '#3B7DD8',      // Particle color
}
```

### Animation Speed
Adjust `CONFIG.animation` values:

```javascript
animation: {
  nebulaRotation: 0.0003,    // Rotation speed
  nebulaFlow: 0.15,          // Shader animation speed
  particleDrift: 0.0005,     // Particle movement
}
```

### Particle Count
Modify `CONFIG.particles` for density:

```javascript
particles: {
  count: 200,        // Outer scattered particles
  innerCount: 80,    // Dense center particles
}
```

## Integration

To use as a website background:

1. Build the project: `npm run build`
2. Copy `dist/` contents to your site
3. Include the canvas element and scripts
4. Your content goes in the `#content` div

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Falls back to video for older browsers.

## Performance Notes

- Automatically limits pixel ratio to 2x
- Animation pauses when tab is not visible
- Reduced geometry on mobile devices
- Uses additive blending for efficient particle rendering

## License

MIT
