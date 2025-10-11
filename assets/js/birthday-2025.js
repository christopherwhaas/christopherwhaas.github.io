/**
 * Birthday 2025 - Make a Wish Interactive Experience
 * Canvas-based starfield with shooting star interaction
 */

// Configuration
const WISH_CONFIG = {
  requiredCatches: 3,
  spawnIntervalMs: [1000, 2000],
  shootingStarSpeed: [2, 4], // pixels per frame (slower = easier to catch)
  showConstellationMs: 1500,
  enableAudio: false,
  audioSrcs: { chime: '/assets/audio/chime.mp3' },
  copy: {
    title: 'Make a wish ✨',
    subtitle: 'Tap 3 shooting stars to continue',
    progress: (n, total) => `Caught ${n} of ${total}`,
    skip: 'Skip intro',
  },
  // Star rendering
  staticStarCount: 500,
  shootingStarHitRadius: 80,
  // Debug
  debug: false
};

// State
let canvas, ctx;
let width, height;
let staticStars = [];
let shootingStars = [];
let catchCount = 0;
let animationId = null;
let spawnTimeoutId = null;
let isCompleting = false;
let isPaused = false;
let prefersReducedMotion = false;

// Check for reduced motion preference
prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Utility: Random number between min and max
 */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Utility: Random integer between min and max (inclusive)
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Utility: Distance between two points
 */
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Static Star class
 */
class Star {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = rand(0, width);
    this.y = rand(0, height);
    this.size = rand(0.5, 2);
    this.opacity = rand(0.3, 1);
    this.twinkleSpeed = rand(0.001, 0.003);
    this.twinklePhase = rand(0, Math.PI * 2);
    this.parallaxFactor = rand(0.5, 1);
  }

  update() {
    if (!prefersReducedMotion) {
      this.twinklePhase += this.twinkleSpeed;
      this.opacity = 0.3 + Math.abs(Math.sin(this.twinklePhase)) * 0.7;
    }
  }

  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Shooting Star class
 */
class ShootingStar {
  constructor() {
    this.reset();
  }

  reset() {
    // Random starting position from edges
    const side = randInt(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    
    switch(side) {
      case 0: // from top
        this.x = rand(width * 0.2, width * 0.8);
        this.y = -50;
        this.angle = rand(Math.PI / 4, Math.PI * 3 / 4);
        break;
      case 1: // from right
        this.x = width + 50;
        this.y = rand(height * 0.2, height * 0.6);
        this.angle = rand(Math.PI * 3 / 4, Math.PI * 5 / 4);
        break;
      case 2: // from top-right (most common)
        this.x = rand(width * 0.6, width + 50);
        this.y = rand(-50, height * 0.3);
        this.angle = rand(Math.PI * 0.6, Math.PI * 0.9);
        break;
      case 3: // from left
        this.x = -50;
        this.y = rand(height * 0.2, height * 0.6);
        this.angle = rand(-Math.PI / 4, Math.PI / 4);
        break;
    }
    
    this.speed = prefersReducedMotion 
      ? rand(WISH_CONFIG.shootingStarSpeed[0], WISH_CONFIG.shootingStarSpeed[1]) 
      : rand(WISH_CONFIG.shootingStarSpeed[0], WISH_CONFIG.shootingStarSpeed[1]);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    
    this.size = 4;
    this.trailLength = prefersReducedMotion ? 5 : 25;
    this.trail = [];
    this.opacity = 1;
    this.caught = false;
    this.active = true;
    this.hitRadius = WISH_CONFIG.shootingStarHitRadius;
  }

  update() {
    if (this.caught) {
      this.opacity -= 0.05;
      if (this.opacity <= 0) {
        this.active = false;
      }
      return;
    }

    // Store trail positions
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Check if off screen
    if (this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100) {
      this.active = false;
    }
  }

  draw() {
    // Draw trail
    if (!prefersReducedMotion && this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const segment = this.trail[i];
        const nextSegment = this.trail[i + 1];
        const alpha = (1 - i / this.trail.length) * this.opacity * 0.6;
        
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = this.size * (1 - i / this.trail.length);
        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y);
        ctx.lineTo(nextSegment.x, nextSegment.y);
        ctx.stroke();
      }
    }

    // Draw core
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
    gradient.addColorStop(0.5, `rgba(255, 215, 0, ${this.opacity * 0.8})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Debug hitbox
    if (WISH_CONFIG.debug) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.hitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  contains(px, py) {
    return distance(this.x, this.y, px, py) <= this.hitRadius;
  }
}

/**
 * Initialize canvas and stars
 */
function setupCanvas() {
  canvas = document.getElementById('wish-canvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Create static stars
  for (let i = 0; i < WISH_CONFIG.staticStarCount; i++) {
    staticStars.push(new Star());
  }
}

/**
 * Resize canvas to fill screen
 */
function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  
  // Reset star positions
  staticStars.forEach(star => {
    if (star.x > width) star.x = width - 10;
    if (star.y > height) star.y = height - 10;
  });
}

/**
 * Spawn a new shooting star
 */
function spawnShootingStar() {
  if (isCompleting || isPaused) return;
  
  const star = new ShootingStar();
  shootingStars.push(star);
  
  // Schedule next spawn
  scheduleNextShootingStar();
}

/**
 * Schedule next shooting star spawn
 */
function scheduleNextShootingStar() {
  if (isCompleting || isPaused) return;
  
  const delay = rand(...WISH_CONFIG.spawnIntervalMs);
  const debugMultiplier = WISH_CONFIG.debug ? 0.3 : 1;
  
  spawnTimeoutId = setTimeout(() => {
    spawnShootingStar();
  }, delay * debugMultiplier);
}

/**
 * Main animation loop
 */
function animate() {
  if (isPaused) return;
  
  // Clear canvas
  ctx.fillStyle = 'rgba(10, 14, 39, 1)';
  ctx.fillRect(0, 0, width, height);
  
  // Update and draw static stars
  staticStars.forEach(star => {
    star.update();
    star.draw();
  });
  
  // Update and draw shooting stars
  shootingStars = shootingStars.filter(star => {
    star.update();
    star.draw();
    return star.active;
  });
  
  animationId = requestAnimationFrame(animate);
}

/**
 * Handle pointer events (mouse/touch)
 */
function handlePointer(e) {
  e.preventDefault();
  
  if (isCompleting || isPaused) return;
  
  // Get pointer position
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  
  // Check for hits on shooting stars
  for (let star of shootingStars) {
    if (!star.caught && star.active && star.contains(px, py)) {
      star.caught = true;
      catchCount++;
      
      // Play sound if enabled
      if (WISH_CONFIG.enableAudio) {
        playSound('chime');
      }
      
      // Create sparkle effect
      createSparkle(star.x, star.y);
      
      // Update UI
      updateProgress();
      
      // Check if complete
      if (catchCount >= WISH_CONFIG.requiredCatches) {
        completeIntro();
      }
      
      break; // Only catch one star per click
    }
  }
}

/**
 * Create sparkle particle effect
 */
function createSparkle(x, y) {
  const sparkleContainer = document.createElement('div');
  sparkleContainer.className = 'sparkle';
  sparkleContainer.style.left = x + 'px';
  sparkleContainer.style.top = y + 'px';
  
  // Create particles
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.className = 'sparkle-particle';
    
    const angle = (Math.PI * 2 * i) / 8;
    const distance = 30;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    
    sparkleContainer.appendChild(particle);
  }
  
  document.getElementById('wish-root').appendChild(sparkleContainer);
  
  // Remove after animation
  setTimeout(() => {
    sparkleContainer.remove();
  }, 600);
}

/**
 * Update progress display
 */
function updateProgress() {
  const progressEl = document.getElementById('wish-progress');
  const text = WISH_CONFIG.copy.progress(catchCount, WISH_CONFIG.requiredCatches);
  progressEl.textContent = text;
  
  // Announce to screen readers
  announceToScreenReader(text);
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message) {
  const progressEl = document.getElementById('wish-progress');
  progressEl.setAttribute('aria-live', 'polite');
  // The text content update will trigger the announcement
}

/**
 * Complete the intro and transition to envelope
 */
function completeIntro() {
  if (isCompleting) return;
  isCompleting = true;
  
  // Stop spawning new stars
  if (spawnTimeoutId) {
    clearTimeout(spawnTimeoutId);
  }
  
  // Show constellation/completion message
  showConstellationMessage();
  
  // Transition to envelope after delay
  setTimeout(() => {
    transitionToEnvelope();
  }, WISH_CONFIG.showConstellationMs);
}

/**
 * Show constellation or completion message
 */
function showConstellationMessage() {
  const message = document.createElement('div');
  message.className = 'constellation-message';
  message.textContent = 'Your wish is on its way...';
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  
  document.getElementById('wish-root').appendChild(message);
  
  // Optionally draw constellation lines between nearby stars
  if (!prefersReducedMotion) {
    drawConstellation();
  }
}

/**
 * Draw constellation lines between stars
 */
function drawConstellation() {
  // Pause regular animation briefly
  const wasAnimating = !isPaused;
  isPaused = true;
  
  // Find nearby stars and connect them
  const connectionDistance = 150;
  const connections = [];
  
  for (let i = 0; i < staticStars.length; i++) {
    for (let j = i + 1; j < staticStars.length; j++) {
      const dist = distance(staticStars[i].x, staticStars[i].y, staticStars[j].x, staticStars[j].y);
      if (dist < connectionDistance && connections.length < 30) {
        connections.push([staticStars[i], staticStars[j]]);
      }
    }
  }
  
  // Animate drawing connections
  let connectionIndex = 0;
  const drawInterval = setInterval(() => {
    if (connectionIndex >= connections.length) {
      clearInterval(drawInterval);
      return;
    }
    
    const [star1, star2] = connections[connectionIndex];
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(star1.x, star1.y);
    ctx.lineTo(star2.x, star2.y);
    ctx.stroke();
    
    connectionIndex++;
  }, 50);
}

/**
 * Transition to envelope section
 */
function transitionToEnvelope() {
  const wishRoot = document.getElementById('wish-root');
  const envelopeSection = document.getElementById('envelope-section');
  
  // Fade out wish intro
  wishRoot.classList.add('transitioning');
  
  setTimeout(() => {
    wishRoot.classList.add('hidden');
    wishRoot.setAttribute('aria-hidden', 'true');
    
    // Show envelope section
    envelopeSection.classList.add('show');
    envelopeSection.removeAttribute('aria-hidden');
    
    // Allow page scroll
    document.body.classList.add('show-envelope');
    document.body.style.overflow = 'auto';
    
    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Focus on envelope for accessibility
    setTimeout(() => {
      document.getElementById('envelope')?.focus();
    }, 100);
  }, 500);
}

/**
 * Skip intro and go directly to envelope
 */
function skipIntro() {
  isCompleting = true;
  
  if (spawnTimeoutId) {
    clearTimeout(spawnTimeoutId);
  }
  
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  transitionToEnvelope();
}

/**
 * Play sound effect
 */
function playSound(soundName) {
  if (!WISH_CONFIG.enableAudio || !WISH_CONFIG.audioSrcs[soundName]) return;
  
  try {
    const audio = new Audio(WISH_CONFIG.audioSrcs[soundName]);
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
  } catch (e) {
    console.log('Audio error:', e);
  }
}

/**
 * Check URL parameters for debug mode
 */
function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('debug') === '1') {
    WISH_CONFIG.debug = true;
    console.log('Debug mode enabled');
  }
  
  if (params.get('skipIntro') === '1') {
    skipIntro();
    return true;
  }
  
  return false;
}

/**
 * Handle page visibility changes (pause when hidden)
 */
function handleVisibilityChange() {
  if (document.hidden) {
    isPaused = true;
    if (spawnTimeoutId) {
      clearTimeout(spawnTimeoutId);
    }
  } else {
    isPaused = false;
    if (!isCompleting) {
      scheduleNextShootingStar();
      animate();
    }
  }
}

/**
 * Initialize the wish intro experience
 */
function initWishIntro() {
  // Check for skip parameter
  if (checkURLParams()) {
    return;
  }
  
  // Setup canvas and stars
  setupCanvas();
  
  // Start animation
  animate();
  
  // Start spawning shooting stars
  scheduleNextShootingStar();
  
  // Bind events
  canvas.addEventListener('click', handlePointer);
  canvas.addEventListener('touchstart', handlePointer, { passive: false });
  
  // Skip button
  const skipButton = document.getElementById('skip-intro');
  if (skipButton) {
    skipButton.addEventListener('click', skipIntro);
    skipButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        skipIntro();
      }
    });
  }
  
  // Handle page visibility
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Initial progress announcement
  announceToScreenReader(WISH_CONFIG.copy.progress(0, WISH_CONFIG.requiredCatches));
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWishIntro);
} else {
  initWishIntro();
}

