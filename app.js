const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const typingArea = document.getElementById('typing-area');
const enemyHpBar = document.getElementById('enemy-hp');
const playerHpBar = document.getElementById('player-hp');
const coinDisplay = document.getElementById('coin-count');
const comboCountDisplay = document.getElementById('combo-count');
const comboContainer = document.getElementById('combo-container');
const levelDisplay = document.getElementById('level-val');
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const charSelection = document.getElementById('char-selection');
const playerSpriteImg = document.getElementById('player-sprite');
const charNameLabel = document.querySelector('.char-name');
const loginScreen = document.getElementById('login-screen');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const switchCharBtn = document.getElementById('switch-char-btn');

const shopOverlay = document.getElementById('shop-overlay');
const closeShopBtn = document.getElementById('close-shop');
const magicList = document.getElementById('magic-list');
const shopUsername = document.getElementById('shop-username');
const shopCoins = document.getElementById('shop-coins');

let width, height;
let particles = [];
let words = [];
let currentWordIndex = -1;
let typedCharsCount = 0;
let combo = 0;

// --- Persistence Data Structure ---
let currentUser = null;
let userData = {
    username: "",
    coins: 0,
    level: 1,
    unlockedSkills: {} // { charId: [skillId1, skillId2...] }
};

const MAGIC_SKILLS = {
    light: [
        { id: 'l1', name: 'Spark', cost: 100, desc: 'Bonus damage for short words' },
        { id: 'l2', name: 'Bolt', cost: 300, desc: 'Completing words speeds up next word' },
        { id: 'l3', name: 'Flash', cost: 600, desc: 'Increases light damage by 20%' },
        { id: 'l4', name: 'Ion', cost: 1000, desc: 'Occasional chain lightning' },
        { id: 'l5', name: 'Saber', cost: 1500, desc: 'Short words become area blasts' },
        { id: 'l6', name: 'Storm', cost: 2000, desc: 'Combos above 10 strike multiple times' },
        { id: 'l7', name: 'Ray', cost: 3000, desc: 'Lasers beam enemies' },
        { id: 'l8', name: 'Prism', cost: 5000, desc: 'Splits small words into 3 hits' },
        { id: 'l9', name: 'Supernova', cost: 8000, desc: 'Full screen clear on high combos' },
        { id: 'l10', name: 'Godspeed', cost: 15000, desc: 'WPM multiplies all damage' }
    ],
    gravity: [
        { id: 'g1', name: 'Mass', cost: 100, desc: 'Long words deal +10% impact' },
        { id: 'g2', name: 'Crush', cost: 300, desc: 'Slows down long words movement' },
        { id: 'g3', name: 'Field', cost: 600, desc: 'Reduces miss penalty' },
        { id: 'g4', name: 'Orb', cost: 1000, desc: 'Summons gravity well' },
        { id: 'g5', name: 'Void', cost: 1500, desc: 'Instakill low HP enemies' },
        { id: 'g6', name: 'Singularity', cost: 2500, desc: 'Pulls all floating words together' },
        { id: 'g7', name: 'Blackhole', cost: 4000, desc: 'Massive blast on massive words' },
        { id: 'g8', name: 'Event Horizon', cost: 7000, desc: 'Coins x2 during long words' },
        { id: 'g9', name: 'Quasar', cost: 10000, desc: 'Beam hits after every long word' },
        { id: 'g10', name: 'Dark Matter', cost: 20000, desc: 'Ultimate gravity weapon' }
    ],
    chronos: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `Time Gear ${i}`, cost: 100 * (i + 1), desc: `Chronos Slot ${i + 1}` })),
    bullet: Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, name: `Velocity ${i}`, cost: 100 * (i + 1), desc: `Bullet Slot ${i + 1}` })),
    luminous: Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, name: `Ethereal ${i}`, cost: 100 * (i + 1), desc: `Luminous Slot ${i + 1}` }))
};

function saveGame() {
    if (!currentUser) return;
    localStorage.setItem(`typing_quest_${currentUser}`, JSON.stringify(userData));
}

function loadGame(username) {
    const saved = localStorage.getItem(`typing_quest_${username}`);
    if (saved) {
        userData = JSON.parse(saved);
        // Ensure all chars have entries in unlockedSkills
        HEROES.forEach(h => {
            if (!userData.unlockedSkills[h.id]) userData.unlockedSkills[h.id] = [];
        });
    } else {
        userData = { username: username, coins: 0, level: 1, unlockedSkills: {} };
        HEROES.forEach(h => userData.unlockedSkills[h.id] = []);
    }
    currentUser = username;
    updateHUDFromData();
}

function updateHUDFromData() {
    coinDisplay.innerText = userData.coins;
    levelDisplay.innerText = userData.level;
}

// --- Character Data ---
const HEROES = [
    { id: 'light', name: 'LIGHT', img: 'player.png', trait: 'Flash: Bonus dmg for short words' },
    { id: 'gravity', name: 'GRAVITY', img: 'gravity.png', trait: 'Pressure: Massive dmg for 8+ char words' },
    { id: 'chronos', name: 'CHRONOS', img: 'chronos.png', trait: 'Time: Rewind 1s on miss (Placeholder)' },
    { id: 'bullet', name: 'BULLET', img: 'bullet.png', trait: 'Haste: Coin bonus based on speed' },
    { id: 'luminous', name: 'LUMINOUS', img: 'luminous.png', trait: 'Barrier: Blocks first 3 misses' }
];

let selectedHero = null;
let enemyHp = 100;
let playerHp = 100;

// --- Particle System ---
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.color = Math.random() > 0.5 ? '#00f3ff' : '#ff00ff';
        this.alpha = Math.random();
        this.life = 1;
        this.decay = 0;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= this.decay;
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life <= 0) this.reset();
    }
    draw() {
        ctx.globalAlpha = this.life * this.alpha;
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
        this.x = Math.random() * (width - 400) + 200;
        this.y = Math.random() * (height - 400) + 200;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.02 + Math.random() * (0.01 + userData.level * 0.005);
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
        if (currentWordIndex !== -1 && words[currentWordIndex] === this) {
            this.element.style.color = '#fff';
            this.element.style.textShadow = '0 0 20px #fff';
        } else {
            this.element.style.color = 'rgba(255,255,255,0.6)';
        }
    }
    destroy() { this.element.remove(); }
}

const WORD_DICTIONARY = {
    short: ["void", "echo", "neon", "zero", "dark", "glow", "fast", "soul", "core", "flux"],
    mid: ["nebula", "cyber", "magic", "pulse", "drift", "impact", "orbit", "flare", "plasma", "stealth"],
    long: ["antigravity", "floating", "velocity", "quantum", "stellar", "metamorph", "galactic", "singularity", "dimension", "interstellar"]
};

function spawnWord() {
    let pool = [];
    if (userData.level === 1) pool = [...WORD_DICTIONARY.short];
    else if (userData.level === 2) pool = [...WORD_DICTIONARY.short, ...WORD_DICTIONARY.mid];
    else pool = [...WORD_DICTIONARY.mid, ...WORD_DICTIONARY.long];
    const text = pool[Math.floor(Math.random() * pool.length)];
    const word = new FloatingWord(text);
    words.push(word);
}

// --- Login & Selection ---
loginBtn.onclick = () => {
    const name = usernameInput.value.trim().toUpperCase();
    if (name) {
        loadGame(name);
        loginScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }
};

function initSelection() {
    charSelection.innerHTML = "";
    HEROES.forEach(hero => {
        const card = document.createElement('div');
        card.className = `char-card`;
        card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><span>${hero.name}</span><small style="font-size: 0.6rem; color: #888;">${hero.trait}</small>`;
        card.onclick = () => selectHero(hero, card);
        charSelection.appendChild(card);
    });
}

function selectHero(hero, card) {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    if (card) card.classList.add('selected');
    selectedHero = hero;
    startBtn.classList.remove('hidden');
    playerSpriteImg.src = hero.img;
    charNameLabel.innerText = hero.name;
    saveGame();
}

switchCharBtn.onclick = () => {
    startScreen.classList.remove('hidden');
    words.forEach(w => w.destroy());
    words = [];
    currentWordIndex = -1;
};

// --- Shop System ---
function openShop() {
    shopUsername.innerText = userData.username;
    shopCoins.innerText = userData.coins;
    magicList.innerHTML = "";
    const skills = MAGIC_SKILLS[selectedHero.id] || [];
    const unlocked = userData.unlockedSkills[selectedHero.id] || [];
    skills.forEach(skill => {
        const isOwned = unlocked.includes(skill.id);
        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
            <div class="skill-info">
                <span class="skill-name">${skill.name}</span>
                <span class="skill-desc">${skill.desc}</span>
            </div>
            <button class="buy-btn ${isOwned ? 'owned' : ''}" onclick="buySkill('${selectedHero.id}', '${skill.id}', ${skill.cost})">
                ${isOwned ? 'OWNED' : skill.cost + ' C'}
            </button>
        `;
        magicList.appendChild(item);
    });
    shopOverlay.classList.remove('hidden');
}

window.buySkill = (charId, skillId, cost) => {
    if (!userData.unlockedSkills[charId]) userData.unlockedSkills[charId] = [];
    if (userData.unlockedSkills[charId].includes(skillId)) return;
    if (userData.coins >= cost) {
        userData.coins -= cost;
        userData.unlockedSkills[charId].push(skillId);
        saveGame();
        openShop();
        updateHUDFromData();
    } else { alert("Not enough coins!"); }
};
closeShopBtn.onclick = () => shopOverlay.classList.add('hidden');

// --- Game Logic ---
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
            triggerExplosion(targetWord.x + (typedCharsCount * 15), targetWord.y, '#00f3ff', 5, 0.1);
            typedCharsCount++;
            combo++;
            updateComboUI();
            if (typedCharsCount === targetWord.text.length) completeWord(targetWord);
        } else {
            handleMiss();
        }
    }
}

function handleMiss() {
    combo = 0;
    updateComboUI();
    playerHp -= 2;
    playerHpBar.style.width = `${playerHp}%`;
    shakeScreen();
    if (playerHp <= 0) {
        alert("GAME OVER! Back to start.");
        location.reload();
    }
}

function updateComboUI() {
    comboCountDisplay.innerText = combo;
    if (combo > 0) comboContainer.classList.add('active');
    else comboContainer.classList.remove('active');
}

function shakeScreen() {
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 200);
}

function completeWord(word) {
    let unlocked = userData.unlockedSkills[selectedHero.id] || [];
    let damageMult = 1;
    let coinMult = 1;

    // Apply generic character logic
    if (selectedHero.id === 'light' && word.text.length <= 3) damageMult *= 1.5;
    if (selectedHero.id === 'gravity' && word.text.length >= 8) damageMult *= 2;

    // Apply Magic Skill logic (Simplified for demo)
    if (unlocked.includes('l1') && word.text.length <= 3) damageMult += 0.05;
    if (unlocked.includes('l3')) damageMult += 0.2;
    if (unlocked.includes('g1') && word.text.length >= 8) damageMult += 0.1;

    let damage = word.text.length * (5 + combo * 0.2) * damageMult;
    enemyHp -= damage;
    enemyHpBar.style.width = `${enemyHp}%`;

    let earned = Math.floor(word.text.length * 10 * (1 + combo * 0.05) * coinMult);
    userData.coins += earned;
    coinDisplay.innerText = userData.coins;
    saveGame();

    word.destroy();
    words = words.filter(w => w !== word);
    currentWordIndex = -1;
    typedCharsCount = 0;

    if (enemyHp <= 0) {
        openShop();
        enemyHp = 100 + userData.level * 10;
        enemyHpBar.style.width = '100%';
    }
    setTimeout(spawnWord, 500);
}

function triggerExplosion(x, y, color = '#ffff00', count = 20, decay = 0.02) {
    for (let i = 0; i < count; i++) {
        const p = new Particle();
        p.x = x; p.y = y;
        p.vx = (Math.random() - 0.5) * 15; p.vy = (Math.random() - 0.5) * 15;
        p.decay = decay; p.color = color;
        particles.push(p);
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    while (particles.length < 100) particles.push(new Particle());
    words.forEach(w => w.update());
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    spawnWord();
    spawnWord();
});

resize();
initSelection();
animate();
