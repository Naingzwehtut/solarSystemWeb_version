// Procedural Texture Generator for the 3D Solar System
// Uses 2D Perlin Noise to create planetary surfaces dynamically

class TextureNoise {
  constructor() {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
    this.permutation = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.permutation[i] = this.p[i & 255];
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    return this.lerp(v,
      this.lerp(u, this.grad(this.permutation[A], x, y),
                   this.grad(this.permutation[B], x - 1, y)),
      this.lerp(u, this.grad(this.permutation[A + 1], x, y - 1),
                   this.grad(this.permutation[B + 1], x - 1, y - 1))
    );
  }

  fbm(x, y, octaves = 4) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return (value / maxVal + 1) / 2; // Normalise to [0, 1]
  }
}

const pNoise = new TextureNoise();

// Helper to create a canvas of given dimensions
function createTextureCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

// 1. SUN TEXTURE
// Soft glowing gradients with high temperature solar spots
function generateSunTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);
  
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = x / 40;
      const ny = y / 40;
      const n = pNoise.fbm(nx, ny, 3);
      
      const r = Math.floor(255);
      const g = Math.floor(190 + n * 65);
      const b = Math.floor(60 + n * 80);
      
      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 2. MERCURY TEXTURE
// Highly cratered, dry, rocky grey surface
function generateMercuryTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = x / 15;
      const ny = y / 15;
      // High frequency noise for fine rock detail
      const n1 = pNoise.fbm(nx, ny, 5);
      const n2 = pNoise.fbm(nx * 3, ny * 3, 2);
      const val = Math.floor(110 + n1 * 50 - n2 * 20);

      imgData.data[idx] = val;
      imgData.data[idx+1] = val;
      imgData.data[idx+2] = val;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw crater impacts
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 256;
    const r = Math.random() * 8 + 2;
    
    // Draw impact ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw ejecta rays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const len = r * (2 + Math.random() * 2);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  return canvas;
}

// 3. VENUS TEXTURE
// Dense, thick orange/yellow sulfuric cloud atmosphere with wind shearing
function generateVenusTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    // Add sinusoidal shear to simulate atmospheric rotation
    const shear = Math.sin(y / 15) * 8;
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = (x + shear) / 25;
      const ny = y / 12;
      
      const n = pNoise.fbm(nx, ny, 4);
      
      const r = Math.floor(190 + n * 65);
      const g = Math.floor(145 + n * 50);
      const b = Math.floor(70 + n * 40);

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 4. EARTH TEXTURE
// Oceans, green/brown continents, and snow caps
function generateEarthTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    const lat = (y / 256) * Math.PI - Math.PI / 2; // Latitude from -PI/2 to PI/2
    const cosLat = Math.cos(lat);
    
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      
      // Scale 3D-like coordinates on a sphere to reduce distortion at poles
      const rad = x / 512 * Math.PI * 2;
      const nx = Math.cos(rad) * cosLat * 2.8;
      const ny = Math.sin(rad) * cosCosWarp(cosLat) * 2.8;
      const nz = Math.sin(lat) * 2.8;

      const n = pNoise.fbm(nx + 10, ny + 10, 6);
      
      let r, g, b;

      // Polar Caps
      if (Math.abs(lat) > 1.25) {
        const polarBlend = Math.min(1, (Math.abs(lat) - 1.25) * 4);
        const snowNoise = pNoise.fbm(x/10, y/10, 2);
        if (snowNoise > 0.25 || polarBlend > 0.8) {
          r = g = b = Math.floor(235 + snowNoise * 20);
        } else {
          // Ocean
          r = 30; g = 75; b = 155;
        }
      } 
      // Land
      else if (n > 0.46) {
        // High terrain (mountains / desert) vs green plains
        const elev = (n - 0.46) / 0.54;
        if (elev > 0.55) {
          // Rocky peaks (brown/white)
          r = Math.floor(139 - elev * 20);
          g = Math.floor(100 - elev * 30);
          b = Math.floor(75 - elev * 40);
        } else if (elev > 0.25) {
          // Deserts / dry lands (beige)
          r = Math.floor(190 + elev * 20);
          g = Math.floor(170 + elev * 10);
          b = Math.floor(130 - elev * 20);
        } else {
          // Grasslands / forests (green)
          r = Math.floor(45 + elev * 25);
          g = Math.floor(115 - elev * 30);
          b = Math.floor(55 - elev * 15);
        }
      } 
      // Shallow vs Deep Ocean
      else {
        const depth = n / 0.46;
        r = Math.floor(10 + depth * 20);
        g = Math.floor(45 + depth * 35);
        b = Math.floor(110 + depth * 45);
      }

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Auxiliary distortion reducer for spherical mapping
function cosCosWarp(c) {
  return c < 0.05 ? 0.05 : c;
}

// 4b. EARTH CLOUDS
// Semi-transparent noise-based cloud map
function generateEarthCloudTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = x / 18;
      const ny = y / 18;
      const n = pNoise.fbm(nx, ny, 4);

      // Cloud density threshold
      if (n > 0.48) {
        const alpha = Math.min(255, Math.floor((n - 0.48) * 4.5 * 255));
        imgData.data[idx] = 255;
        imgData.data[idx+1] = 255;
        imgData.data[idx+2] = 255;
        imgData.data[idx+3] = alpha;
      } else {
        imgData.data[idx] = 0;
        imgData.data[idx+1] = 0;
        imgData.data[idx+2] = 0;
        imgData.data[idx+3] = 0;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 5. MARS TEXTURE
// Rust-red desert with dark volcanic plains (maria) and white carbon-dioxide polar caps
function generateMarsTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    const lat = (y / 256) * Math.PI - Math.PI / 2;
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = x / 25;
      const ny = y / 25;
      
      const n = pNoise.fbm(nx, ny, 5);
      
      let r, g, b;

      // Polar Caps
      if ((y < 18 && pNoise.noise(x/10, y/5) > -0.2) || (y > 238 && pNoise.noise(x/10, y/5) > -0.1)) {
        r = g = b = 245;
      } 
      // Dark areas (syrtis major, etc.)
      else if (n < 0.38) {
        const darkBlend = n / 0.38;
        r = Math.floor(100 + darkBlend * 40);
        g = Math.floor(65 + darkBlend * 15);
        b = Math.floor(50 + darkBlend * 10);
      } 
      // Reddish-orange iron oxide sands
      else {
        r = Math.floor(180 + n * 65);
        g = Math.floor(80 + n * 40);
        b = Math.floor(50 + n * 20);
      }

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 6. JUPITER TEXTURE
// Colorful horizontal gas bands with shear swirls and the Great Red Spot
function generateJupiterTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  // Great Red Spot parameters
  // Coordinates in pixel space (centered around x=320, y=175)
  const grsX = 330;
  const grsY = 175;
  const grsRx = 32;
  const grsRy = 18;

  for (let y = 0; y < 256; y++) {
    // Shearing factor depends on latitude
    const waveFreq = 4.5;
    const waveAmp = 6.0;
    const shear = Math.sin(y / 10) * waveAmp + pNoise.noise(y/8, 0) * 8;
    
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      
      // Base bands
      const nx = (x + shear) / 25;
      const ny = y / 8;
      const n = pNoise.fbm(nx, ny, 4);
      
      let r, g, b;

      // Draw procedural gas giant color strips
      if (y < 40 || y > 216) {
        // Greyish polar regions
        r = Math.floor(140 + n * 30);
        g = Math.floor(125 + n * 25);
        b = Math.floor(110 + n * 25);
      } else {
        // Orange, red, brown, cream bands
        const bandVal = (Math.sin(y * 0.15) + 1) / 2; // [0, 1]
        const mix = (bandVal * 0.6) + (n * 0.4);
        
        if (mix > 0.7) {
          // Cream / White belt
          r = Math.floor(225 + n * 25);
          g = Math.floor(205 + n * 20);
          b = Math.floor(185 + n * 20);
        } else if (mix > 0.45) {
          // Orange band
          r = Math.floor(195 + n * 30);
          g = Math.floor(135 + n * 20);
          b = Math.floor(90 + n * 15);
        } else {
          // Dark reddish brown belt
          r = Math.floor(145 + n * 25);
          g = Math.floor(95 + n * 15);
          b = Math.floor(65 + n * 15);
        }
      }

      // Check if pixel falls inside the Great Red Spot oval
      const dx = (x - grsX);
      const dy = (y - grsY);
      const dist = (dx * dx) / (grsRx * grsRx) + (dy * dy) / (grsRy * grsRy);

      if (dist < 1.0) {
        const spotBlend = 1.0 - dist; // Higher near center
        const spotNoise = pNoise.fbm(x/6, y/4, 2);
        
        // Deep brick-red/orange spot
        r = Math.floor(r * (1 - spotBlend) + (175 + spotNoise * 35) * spotBlend);
        g = Math.floor(g * (1 - spotBlend) + (65 + spotNoise * 15) * spotBlend);
        b = Math.floor(b * (1 - spotBlend) + (45 + spotNoise * 10) * spotBlend);
      }

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 7. SATURN TEXTURE
// Soft, calm, golden-brown banded atmosphere
function generateSaturnTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    const shear = Math.sin(y / 15) * 4;
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = (x + shear) / 30;
      const ny = y / 14;
      const n = pNoise.fbm(nx, ny, 3);
      
      const bandVal = (Math.sin(y * 0.1) + 1) / 2;
      const mix = (bandVal * 0.7) + (n * 0.3);

      let r, g, b;
      if (mix > 0.6) {
        // Bright golden cream
        r = Math.floor(230 + n * 20);
        g = Math.floor(205 + n * 15);
        b = Math.floor(150 + n * 15);
      } else {
        // Soft golden brown
        r = Math.floor(190 + n * 25);
        g = Math.floor(165 + n * 20);
        b = Math.floor(115 + n * 15);
      }

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 8. URANUS TEXTURE
// Very soft, uniform pale turquoise/cyan methane atmosphere
function generateUranusTexture() {
  const { canvas, ctx } = createTextureCanvas(256, 128);
  const imgData = ctx.createImageData(256, 128);

  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const n = pNoise.fbm(x / 20, y / 10, 2);
      
      // Pale cyan-green base with faint bands
      const r = Math.floor(160 + n * 15);
      const g = Math.floor(225 + n * 12);
      const b = Math.floor(220 + n * 15);

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 9. NEPTUNE TEXTURE
// Deep royal blue, darker blue bands, and light methane cloud wisps
function generateNeptuneTexture() {
  const { canvas, ctx } = createTextureCanvas(512, 256);
  const imgData = ctx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    const shear = Math.sin(y / 12) * 8 + pNoise.noise(y/6, 0) * 12;
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = (x + shear) / 20;
      const ny = y / 10;
      
      const n = pNoise.fbm(nx, ny, 4);
      const band = (Math.sin(y * 0.08) + 1) / 2;
      
      let r, g, b;

      // Base blue bands
      if (band > 0.65) {
        // Brighter azure band
        r = Math.floor(65 + n * 20);
        g = Math.floor(110 + n * 25);
        b = Math.floor(235 + n * 20);
      } else {
        // Deep royal cobalt blue
        r = Math.floor(30 + n * 15);
        g = Math.floor(60 + n * 20);
        b = Math.floor(175 + n * 25);
      }

      // Add high-altitude white cloud streaks (like the "Scooter" storm)
      const cloudNoise = pNoise.fbm(nx * 1.5, ny * 1.5, 3);
      if (cloudNoise > 0.64 && y > 80 && y < 180) {
        const strength = (cloudNoise - 0.64) / 0.36;
        r = Math.floor(r * (1 - strength) + 210 * strength);
        g = Math.floor(g * (1 - strength) + 230 * strength);
        b = Math.floor(b * (1 - strength) + 255 * strength);
      }

      imgData.data[idx] = r;
      imgData.data[idx+1] = g;
      imgData.data[idx+2] = b;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 10. MOON TEXTURE
// Desaturated, heavily cratered gray-white texture with dark basalt lava seas (maria)
function generateMoonTexture() {
  const { canvas, ctx } = createTextureCanvas(256, 128);
  const imgData = ctx.createImageData(256, 128);

  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const nx = x / 10;
      const ny = y / 10;
      const n = pNoise.fbm(nx, ny, 5);
      
      let val;
      // Basalt maria (dark plains)
      if (n < 0.4) {
        val = Math.floor(115 + n * 50);
      } else {
        // Brighter highlands
        val = Math.floor(155 + n * 65);
      }

      imgData.data[idx] = val;
      imgData.data[idx+1] = val;
      imgData.data[idx+2] = val;
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw crater dots on moon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * 256;
    const cy = Math.random() * 128;
    const r = Math.random() * 4 + 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

// 11. SATURN RINGS TEXTURE
// Radial concentric transparency stripes mimicking A, B, C rings and Cassini Division
function generateSaturnRingTexture() {
  const { canvas, ctx } = createTextureCanvas(256, 4);
  const imgData = ctx.createImageData(256, 4);

  // Map 256 pixels horizontally representing radial distance from inner to outer ring edge
  for (let x = 0; x < 256; x++) {
    const rDist = x / 255; // Normalized radius [0, 1]
    
    let color, alpha;
    
    // Ring gaps and densities
    if (rDist < 0.08) {
      // Inner C-Ring (faint, greyish-yellow)
      color = { r: 165, g: 155, b: 130 };
      alpha = Math.floor(45 + rDist * 80);
    } else if (rDist < 0.12) {
      // Transition gap
      color = { r: 120, g: 110, b: 90 };
      alpha = 15;
    } else if (rDist < 0.58) {
      // Dense B-Ring (brightest, golden beige)
      color = { r: 232, g: 215, b: 180 };
      // Concentric structure using high-frequency sine waves
      const stripe = Math.sin(rDist * 250) * 0.15 + 0.85;
      alpha = Math.floor(160 * stripe);
    } else if (rDist < 0.66) {
      // Cassini Division (virtually empty gap)
      color = { r: 40, g: 35, b: 30 };
      alpha = 8;
    } else if (rDist < 0.94) {
      // A-Ring (medium brightness, grey-golden)
      color = { r: 195, g: 180, b: 150 };
      const stripe = Math.sin(rDist * 350) * 0.1 + 0.9;
      alpha = Math.floor(110 * stripe);
    } else if (rDist < 0.96) {
      // Encke Gap
      color = { r: 20, g: 20, b: 20 };
      alpha = 4;
    } else {
      // Faint outer F-ring border
      color = { r: 180, g: 170, b: 140 };
      alpha = 40;
    }

    // Apply color and transparency across all 4 vertical pixels
    for (let y = 0; y < 4; y++) {
      const idx = (y * 256 + x) * 4;
      imgData.data[idx] = color.r;
      imgData.data[idx+1] = color.g;
      imgData.data[idx+2] = color.b;
      imgData.data[idx+3] = alpha;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
