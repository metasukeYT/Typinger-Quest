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
const registerBtn = document.getElementById('register-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
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

// --- Auth & Persistence ---
let currentUserEmail = null;
let userData = {
    email: "",
    coins: 0,
    level: 1,
    unlockedSkills: {}
};

function saveGame() {
    if (!currentUserEmail) return;
    const users = JSON.parse(localStorage.getItem('tq_users') || '{}');
    users[currentUserEmail].data = userData;
    localStorage.setItem('tq_users', JSON.stringify(users));
}

function handleLogin() {
    const email = emailInput.value.trim().toLowerCase();
    const pass = passwordInput.value;
    const users = JSON.parse(localStorage.getItem('tq_users') || '{}');

    if (users[email] && users[email].password === pass) {
        currentUserEmail = email;
        userData = users[email].data;
        loginScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        updateHUDFromData();
        authError.classList.add('hidden');
    } else {
        authError.innerText = "Invalid credentials.";
        authError.classList.remove('hidden');
    }
}

function handleRegister() {
    const email = emailInput.value.trim().toLowerCase();
    const pass = passwordInput.value;

    if (!email || !pass) {
        authError.innerText = "Please fill all fields.";
        authError.classList.remove('hidden');
        return;
    }

    const users = JSON.parse(localStorage.getItem('tq_users') || '{}');
    if (users[email]) {
        authError.innerText = "Email already exists.";
        authError.classList.remove('hidden');
    } else {
        users[email] = {
            password: pass,
            data: {
                email: email,
                coins: 0,
                level: 1,
                unlockedSkills: {
                    light: [], gravity: [], chronos: [], bullet: [], luminous: []
                }
            }
        };
        localStorage.setItem('tq_users', JSON.stringify(users));
        alert("Registration Successful! Please login.");
        authError.classList.add('hidden');
    }
}

function updateHUDFromData() {
    coinDisplay.innerText = userData.coins;
    levelDisplay.innerText = userData.level;
}

// --- Character Data ---
const HEROES = [
    { id: 'light', name: 'LIGHT', img: 'player.png', trait: 'Flash: Bonus dmg for short words' },
    { id: 'gravity', name: 'GRAVITY', img: 'gravity.png', trait: 'Pressure: Massive dmg for 8+ char words' },
    { id: 'chronos', name: 'CHRONOS', img: 'chronos.png', trait: 'Time: Rewind 1s on miss' },
    { id: 'bullet', name: 'BULLET', img: 'bullet.png', trait: 'Haste: Coin bonus based on speed' },
    { id: 'luminous', name: 'LUMINOUS', img: 'luminous.png', trait: 'Barrier: Blocks miss penalty' }
];

let selectedHero = null;
let enemyHp = 100;
let playerHp = 100;

// --- Particle System ---
class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * width; this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
        this.color = Math.random() > 0.5 ? '#00f3ff' : '#ff00ff';
        this.alpha = Math.random(); this.life = 1; this.decay = 0;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life -= this.decay;
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life <= 0) this.reset();
    }
    draw() {
        ctx.globalAlpha = this.life * this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
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
            this.element.style.textShadow = '0 0 20px var(--neon-cyan), 0 0 40px var(--neon-cyan)';
            this.element.style.transform += ' scale(1.1)';
        } else {
            this.element.style.color = 'rgba(255,255,255,0.6)';
            this.element.style.textShadow = 'none';
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

function initSelection() {
    charSelection.innerHTML = "";
    HEROES.forEach(hero => {
        const card = document.createElement('div');
        card.className = `char-card`;
        card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><span>${hero.name}</span><small style="font-size: 0.6rem; color: #888;">${hero.trait}</small>`;
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            selectHero(hero, card);
        });
        charSelection.appendChild(card);
    });
}

function selectHero(hero, card) {
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
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

// --- Game Logic ---
let wordStartTime = 0;

function handleInput(e) {
    if (words.length === 0 || !selectedHero) return;
    const key = e.key.toLowerCase();
    if (currentWordIndex === -1) {
        for (let i = 0; i < words.length; i++) {
            if (words[i].text[0] === key) {
                currentWordIndex = i;
                typedCharsCount = 0;
                wordStartTime = Date.now();
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
            combo++;
            updateComboUI();
            if (typedCharsCount === targetWord.text.length) completeWord(targetWord);
        } else {
            handleMiss();
        }
    }
}

function handleMiss() {
    combo = 0; updateComboUI();

    // Luminous Trait: 50% chance to block damage
    if (selectedHero.id === 'luminous' && Math.random() > 0.5) {
        triggerExplosion(width / 2, height / 2, '#fff', 10, 0.05);
        return;
    }

    // Chronos Trait: Half damage taken
    let damageTaken = (selectedHero.id === 'chronos') ? 1 : 2;
    playerHp -= damageTaken;
    playerHpBar.style.width = `${playerHp}%`;
    shakeScreen();
    if (playerHp <= 0) { alert("Pilot down. Re-initializing..."); location.reload(); }
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

    // Character Traits
    if (selectedHero.id === 'light' && word.text.length <= 4) damageMult *= 1.5;
    if (selectedHero.id === 'gravity' && word.text.length >= 8) damageMult *= 2.5;

    // Bullet Trait: Speed bonus
    if (selectedHero.id === 'bullet') {
        const timeTaken = (Date.now() - wordStartTime) / 1000;
        const speedBonus = Math.max(0.5, 2 - timeTaken); // Faster typing = higher mult
        coinMult *= speedBonus;
    }

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
        userData.level++;
        levelDisplay.innerText = userData.level;
        saveGame();
        alert("Enemy Neutralized. Level increased.");
        enemyHp = 100 + userData.level * 10;
        enemyHpBar.style.width = '100%';
    }
    setTimeout(spawnWord, 500);
}

// --- Init & Loop ---
loginBtn.onclick = handleLogin;
registerBtn.onclick = handleRegister;

window.addEventListener('resize', resize);
window.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    spawnWord(); spawnWord();
});

resize();
initSelection();

function animate() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    while (particles.length < 100) particles.push(new Particle());
    words.forEach(w => w.update());
    requestAnimationFrame(animate);
}
animate();
