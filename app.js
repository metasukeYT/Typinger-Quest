const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const typingArea = document.getElementById('typing-area');
const enemyHpBar = document.getElementById('enemy-hp');
const playerHpBar = document.getElementById('player-hp');
const coinDisplay = document.getElementById('coin-count');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const charSelection = document.getElementById('char-selection');
const playerSpriteImg = document.getElementById('player-sprite');
const charNameLabel = document.querySelector('.char-name');

let width, height;
let particles = [];
let words = [];
let currentWordIndex = -1;
let typedCharsCount = 0;
let coins = 0;
let enemyHp = 100;
let playerHp = 100;

let selectedHero = null;

// --- Character Data ---
const HEROES = [
    { id: 'light', name: 'LIGHT', img: 'player.png', trait: 'Flash: Bonus dmg for short words' },
    { id: 'gravity', name: 'GRAVITY', img: 'gravity.png', trait: 'Pressure: Massive dmg for 8+ char words' },
    { id: 'chronos', name: 'CHRONOS', img: 'chronos.png', trait: 'Time: Rewind 1s on miss (Placeholder)' },
    { id: 'bullet', name: 'BULLET', img: 'bullet.png', trait: 'Haste: Coin bonus based on speed' },
    { id: 'luminous', name: 'LUMINOUS', img: 'luminous.png', trait: 'Barrier: Blocks first 3 misses' },
    { id: 'oboro', name: 'OBORO', img: 'player.png', trait: 'Shift: Locked (Coming Soon)', locked: true },
    { id: 'drake', name: 'DRAKE', img: 'player.png', trait: 'Greed: Locked (Coming Soon)', locked: true },
    { id: 'unit00', name: 'UNIT-00', img: 'player.png', trait: 'Precision: Locked (Coming Soon)', locked: true },
    { id: 'melody', name: 'MELODY', img: 'player.png', trait: 'Rhythm: Locked (Coming Soon)', locked: true },
    { id: 'zero', name: 'ZERO', img: 'player.png', trait: 'Void: Locked (Coming Soon)', locked: true }
];

// --- Particle System ---
class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.color = Math.random() > 0.5 ? '#00f3ff' : '#ff00ff';
        this.alpha = Math.random();
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
    }
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 100; i++) particles.push(new Particle());
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
}

// --- Floating Words ---
class FloatingWord {
    constructor(text) {
        this.text = text;
        this.x = Math.random() * (width - 200) + 100;
        this.y = Math.random() * (height - 400) + 200;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.02 + Math.random() * 0.02;
        this.amplitude = 20 + Math.random() * 30;

        this.element = document.createElement('div');
        this.element.className = 'floating-word';
        this.element.innerHTML = text.split('').map(char => `<span class="word-char">${char}</span>`).join('');
        typingArea.appendChild(this.element);
    }

    update() {
        this.angle += this.speed;
        const offsetY = Math.sin(this.angle) * this.amplitude;
        const offsetX = Math.cos(this.angle * 0.5) * (this.amplitude * 0.5);
        this.element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    destroy() {
        this.element.remove();
    }
}

const WORD_LIST = ["antigravity", "floating", "neon", "nebula", "cyber", "magic", "void", "pulse", "echo", "drift", "gravity", "nebula", "velocity", "quantum", "stellar"];

function spawnWord() {
    const text = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const word = new FloatingWord(text);
    words.push(word);
}

// --- Character Selection ---
function initSelection() {
    HEROES.forEach(hero => {
        const card = document.createElement('div');
        card.className = `char-card ${hero.locked ? 'locked' : ''}`;
        card.innerHTML = `
            <img src="${hero.img}" alt="${hero.name}">
            <span>${hero.name}</span>
            <small style="font-size: 0.6rem; color: #888;">${hero.trait}</small>
        `;
        if (!hero.locked) {
            card.onclick = () => selectHero(hero, card);
        }
        charSelection.appendChild(card);
    });
}

function selectHero(hero, card) {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedHero = hero;
    startBtn.classList.remove('hidden');

    // Update HUD Preview
    playerSpriteImg.src = hero.img;
    charNameLabel.innerText = hero.name;
    charNameLabel.style.color = getHeroColor(hero.id);
    charNameLabel.style.textShadow = `0 0 10px ${getHeroColor(hero.id)}`;
}

function getHeroColor(id) {
    switch (id) {
        case 'light': return '#00f3ff';
        case 'gravity': return '#ff00ff';
        case 'chronos': return '#00ff88';
        case 'bullet': return '#ffff00';
        case 'luminous': return '#ffffff';
        default: return '#ffffff';
    }
}

// --- Game Logic ---
let missCount = 0;
function handleInput(e) {
    if (words.length === 0 || !selectedHero) return;

    const key = e.key.toLowerCase();

    if (currentWordIndex === -1) {
        for (let i = 0; i < words.length; i++) {
            if (words[i].text[0] === key) {
                currentWordIndex = i;
                typedCharsCount = 0;
                break;
            }
        }
    }

    if (currentWordIndex !== -1) {
        const targetWord = words[currentWordIndex];
        if (targetWord.text[typedCharsCount] === key) {
            const chars = targetWord.element.querySelectorAll('.word-char');
            chars[typedCharsCount].classList.add('typed');
            typedCharsCount++;

            if (typedCharsCount === targetWord.text.length) {
                completeWord(targetWord);
            }
        } else {
            // Handle Miss
            handleMiss();
        }
    }
}

function handleMiss() {
    if (selectedHero.id === 'luminous' && missCount < 3) {
        missCount++;
        // Visual feedback for barrier
        triggerExplosion(width / 2, height / 2, '#ffffff', 5);
        return;
    }

    // Regular miss damage (placeholder)
    playerHp -= 5;
    playerHpBar.style.width = `${playerHp}%`;
}

function completeWord(word) {
    let damage = word.text.length * 5;
    let coinBonus = 0;

    // --- Trait Logic ---
    if (selectedHero.id === 'light' && word.text.length <= 3) {
        damage *= 2;
        triggerExplosion(word.x, word.y, '#00f3ff');
    }
    if (selectedHero.id === 'gravity' && word.text.length >= 8) {
        damage *= 2.5;
        triggerExplosion(word.x, word.y, '#ff00ff', 30);
    }
    if (selectedHero.id === 'bullet') {
        coinBonus = 20; // Simplified flat bonus for bullet
    }

    enemyHp -= damage;
    if (enemyHp < 0) enemyHp = 0;
    enemyHpBar.style.width = `${enemyHp}%`;

    coins += (word.text.length * 10) + coinBonus;
    coinDisplay.innerText = coins;

    word.destroy();
    words = words.filter(w => w !== word);
    currentWordIndex = -1;
    typedCharsCount = 0;

    if (enemyHp <= 0) {
        victory();
    } else {
        setTimeout(spawnWord, 500);
    }
}

function triggerExplosion(x, y, color = '#ffff00', count = 20) {
    for (let i = 0; i < count; i++) {
        const p = new Particle();
        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 10;
        p.size = Math.random() * 5 + 2;
        p.color = color;
        particles.push(p);
    }
}

function victory() {
    alert("VICTORY! Coins earned: " + coins);
    document.getElementById('shop-overlay').classList.remove('hidden');
}

// --- Animation Loop ---
function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    words.forEach(w => w.update());
    requestAnimationFrame(animate);
}

// --- Init ---
window.addEventListener('resize', resize);
window.addEventListener('keydown', handleInput);

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    spawnWord();
    spawnWord();
    spawnWord();
});

resize();
initSelection();
animate();
