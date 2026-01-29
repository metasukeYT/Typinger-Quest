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
const guestBtn = document.getElementById('guest-btn');
const verifySection = document.getElementById('verify-section');
const verifyInput = document.getElementById('verify-input');
const verifyBtn = document.getElementById('verify-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
const switchCharBtn = document.getElementById('switch-char-btn');
const storyOverlay = document.getElementById('story-overlay');
const dialogueText = document.getElementById('dialogue-text');
const speakerName = document.querySelector('.speaker-name');
const stageScreen = document.getElementById('stage-screen');
const stageList = document.getElementById('stage-list');

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

// --- Japanese Romaji Dictionary ---
const WORD_DICTIONARY = {
    short: [
        { kanji: "火", romaji: "hi" }, { kanji: "水", romaji: "mizu" }, { kanji: "木", romaji: "ki" },
        { kanji: "星", romaji: "hoshi" }, { kanji: "光", romaji: "hikari" }, { kanji: "影", romaji: "kage" }
    ],
    mid: [
        { kanji: "宇宙", romaji: "uchuu" }, { kanji: "銀河", romaji: "ginga" }, { kanji: "重力", romaji: "juuryoku" },
        { kanji: "虚無", romaji: "kyomu" }, { kanji: "閃光", romaji: "senkou" }, { kanji: "異次元", romaji: "ijigen" }
    ],
    long: [
        { kanji: "万有引力", romaji: "banyuuinryoku" }, { kanji: "暗黒物質", romaji: "ankokubusshitsu" },
        { kanji: "時空超越", romaji: "jikuuchouetsu" }, { kanji: "不滅存在", romaji: "fumetsusonzai" },
        { kanji: "無限螺旋", romaji: "mugenrasen" }
    ]
};

// --- Stage Data ---
const STAGES = [
    { id: 1, name: "Stage 01", difficulty: "Entry", hp: 100, speedMult: 1.0, words: ['short'] },
    { id: 2, name: "Stage 02", difficulty: "Novice", hp: 150, speedMult: 1.1, words: ['short', 'mid'] },
    { id: 3, name: "Stage 03", difficulty: "Normal", hp: 200, speedMult: 1.2, words: ['short', 'mid'] },
    { id: 4, name: "Stage 04", difficulty: "Adept", hp: 300, speedMult: 1.3, words: ['mid'] },
    { id: 5, name: "Stage 05", difficulty: "Elite", hp: 450, speedMult: 1.4, words: ['mid', 'long'] },
    { id: 6, name: "Stage 06", difficulty: "Expert", hp: 600, speedMult: 1.5, words: ['mid', 'long'] },
    { id: 7, name: "Stage 07", difficulty: "Master", hp: 800, speedMult: 1.6, words: ['long'] },
    { id: 8, name: "Stage 08", difficulty: "Grand", hp: 1100, speedMult: 1.7, words: ['long'] },
    { id: 9, name: "Stage 09", difficulty: "Legend", hp: 1500, speedMult: 1.8, words: ['long'] },
    { id: 10, name: "Stage 10", difficulty: "Divine", hp: 2000, speedMult: 2.0, words: ['long'] }
];

let selectedStage = null;

// --- Story Data ---
const STORY_CHAPTERS = {
    1: [
        { speaker: "CHRONOS", text: "気がついたか、パイロット。この世界は今、タイピングエネルギーを失い、虚無に包まれようとしている。" },
        { speaker: "CHRONOS", text: "君の打鍵の響きだけが、この宇宙を繋ぎ止める唯一の希望だ。" },
        { speaker: "CHRONOS", text: "さあ、最初の虚無の化身が近づいている。キーを叩き、その力を解き放て！" }
    ],
    // Add more if needed per stage id
};

let currentDialogueIndex = 0;
let isStoryActive = false;

// --- Auth & Persistence ---
let currentUserEmail = null;
let userData = {
    email: "",
    coins: 0,
    level: 1,
    unlockedSkills: {
        light: [], gravity: [], chronos: [], bullet: [], luminous: []
    }
};

let tempUserData = null;
let currentVerificationCode = "";

function saveGame() {
    if (!currentUserEmail) return;
    if (currentUserEmail === "GUEST") {
        localStorage.setItem('tq_guest_data', JSON.stringify(userData));
        return;
    }
    const users = JSON.parse(localStorage.getItem('tq_users') || '{}');
    if (users[currentUserEmail]) {
        users[currentUserEmail].data = userData;
        localStorage.setItem('tq_users', JSON.stringify(users));
    }
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
        authError.innerText = "認証に失敗しました。";
        authError.classList.remove('hidden');
    }
}

function handleRegister() {
    const email = emailInput.value.trim().toLowerCase();
    const pass = passwordInput.value;
    if (!email || !pass) {
        authError.innerText = "すべての項目を入力してください。";
        authError.classList.remove('hidden');
        return;
    }
    const users = JSON.parse(localStorage.getItem('tq_users') || '{}');
    if (users[email]) {
        authError.innerText = "このメールアドレスは既に登録されています。";
        authError.classList.remove('hidden');
        return;
    }
    currentVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    tempUserData = { email, pass };
    alert(`[シミュレーション] ${email} に認証コードを送信しました: ${currentVerificationCode}`);
    document.querySelector('.auth-actions').classList.add('hidden');
    document.querySelector('.input-group').classList.add('hidden');
    verifySection.classList.remove('hidden');
}

function handleVerify() {
    const code = verifyInput.value.trim();
    if (code === currentVerificationCode) {
        const email = tempUserData.email;
        const pass = tempUserData.pass;
        const users = JSON.parse(localStorage.getItem('tq_users') || '{}');
        users[email] = {
            password: pass,
            data: {
                email: email, coins: 0, level: 1, unlockedSkills: { light: [], gravity: [], chronos: [], bullet: [], luminous: [] }
            }
        };
        localStorage.setItem('tq_users', JSON.stringify(users));
        alert("登録が完了しました！ログインしてください。");
        location.reload();
    } else {
        authError.innerText = "認証コードが正しくありません。";
        authError.classList.remove('hidden');
    }
}

function handleGuest() {
    currentUserEmail = "GUEST";
    const savedGuest = localStorage.getItem('tq_guest_data');
    if (savedGuest) { userData = JSON.parse(savedGuest); }
    else { userData = { email: "GUEST", coins: 0, level: 1, unlockedSkills: { light: [], gravity: [], chronos: [], bullet: [], luminous: [] } }; }
    loginScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    updateHUDFromData();
}

function updateHUDFromData() {
    coinDisplay.innerText = userData.coins;
    levelDisplay.innerText = userData.level;
}

// --- Character Data ---
const HEROES = [
    { id: 'light', name: 'LIGHT / 光', img: 'player.png', trait: 'Flash: 4文字以下の単語でダメージ増加' },
    { id: 'gravity', name: 'GRAVITY / 重力', img: 'gravity.png', trait: 'Pressure: 8文字以上の単語で超ダメージ' },
    { id: 'chronos', name: 'CHRONOS / 時間', img: 'chronos.png', trait: 'Time: ミス時のペナルティを半減' },
    { id: 'bullet', name: 'BULLET / 弾丸', img: 'bullet.png', trait: 'Haste: タイピング速度に応じてコインボーナス' },
    { id: 'luminous', name: 'LUMINOUS / 輝き', img: 'luminous.png', trait: 'Barrier: 50%の確率でミスを無効化' }
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

// --- Floating Words (Japanese / Romaji) ---
class FloatingWord {
    constructor(data) {
        this.kanji = data.kanji;
        this.romaji = data.romaji;
        this.x = Math.random() * (width - 400) + 200;
        this.y = Math.random() * (height - 400) + 200;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = (0.02 + Math.random() * (0.01 + userData.level * 0.005)) * (selectedStage ? selectedStage.speedMult : 1);
        this.amplitude = 20 + Math.random() * 30;
        this.element = document.createElement('div');
        this.element.className = 'floating-word';
        this.element.innerHTML = `
            <div class="word-kanji">${this.kanji}</div>
            <div class="word-romaji">${this.romaji.split('').map(char => `<span class="word-char">${char}</span>`).join('')}</div>
        `;
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
            this.element.style.filter = 'drop-shadow(0 0 10px var(--neon-cyan)) scale(1.1)';
            this.element.style.color = '#fff';
        } else {
            this.element.style.filter = 'none';
            this.element.style.color = 'rgba(255,255,255,0.6)';
        }
    }
    destroy() { this.element.remove(); }
}

function spawnWord() {
    let pool = [];
    const pools = selectedStage ? selectedStage.words : ['short'];
    pools.forEach(p => {
        pool = [...pool, ...WORD_DICTIONARY[p]];
    });
    const data = pool[Math.floor(Math.random() * pool.length)];
    const word = new FloatingWord(data);
    words.push(word);
}

function initSelection() {
    charSelection.innerHTML = "";
    HEROES.forEach(hero => {
        const card = document.createElement('div');
        card.className = `char-card`;
        card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><span>${hero.name}</span><small style="font-size: 0.6rem; color: #888;">${hero.trait}</small>`;
        card.addEventListener('click', (e) => { e.stopPropagation(); selectHero(hero, card); });
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

function initStageSelection() {
    stageList.innerHTML = "";
    STAGES.forEach(stage => {
        const card = document.createElement('div');
        card.className = 'stage-card';
        card.innerHTML = `<h3>${stage.name}</h3><p>${stage.difficulty}</p>`;
        card.onclick = () => selectStage(stage);
        stageList.appendChild(card);
    });
}

function selectStage(stage) {
    selectedStage = stage;
    enemyHp = stage.hp;
    enemyHpBar.style.width = '100%';
    stageScreen.classList.add('hidden');
    startStory();
}

switchCharBtn.onclick = () => {
    startScreen.classList.remove('hidden');
    stageScreen.classList.add('hidden');
    words.forEach(w => w.destroy());
    words = [];
    currentWordIndex = -1;
};

// --- Story Controller ---
function startStory() {
    isStoryActive = true;
    currentDialogueIndex = 0;
    const dialogue = STORY_CHAPTERS[selectedStage.id] || STORY_CHAPTERS[1];
    storyOverlay.classList.remove('hidden');
    renderDialogue(dialogue);
}

function renderDialogue(dialogue) {
    const item = dialogue[currentDialogueIndex];
    speakerName.innerText = item.speaker;
    dialogueText.innerText = item.text;
}

storyOverlay.onclick = () => {
    const dialogue = STORY_CHAPTERS[selectedStage.id] || STORY_CHAPTERS[1];
    currentDialogueIndex++;
    if (currentDialogueIndex >= dialogue.length) {
        storyOverlay.classList.add('hidden');
        isStoryActive = false;
        spawnWord(); spawnWord();
    } else {
        renderDialogue(dialogue);
    }
};

// --- Game Logic ---
let wordStartTime = 0;
function handleInput(e) {
    if (words.length === 0 || !selectedHero || isStoryActive) return;
    const key = e.key.toLowerCase();
    if (currentWordIndex === -1) {
        for (let i = 0; i < words.length; i++) {
            if (words[i].romaji[0] === key) {
                currentWordIndex = i;
                typedCharsCount = 0;
                wordStartTime = Date.now();
                break;
            }
        }
    }
    if (currentWordIndex !== -1) {
        const targetWord = words[currentWordIndex];
        if (targetWord.romaji[typedCharsCount] === key) {
            const chars = targetWord.element.querySelectorAll('.word-char');
            chars[typedCharsCount].classList.add('typed');
            typedCharsCount++;
            combo++;
            updateComboUI();
            if (typedCharsCount === targetWord.romaji.length) completeWord(targetWord);
        } else {
            handleMiss();
        }
    }
}

function handleMiss() {
    combo = 0; updateComboUI();
    if (selectedHero.id === 'luminous' && Math.random() > 0.5) {
        triggerExplosion(width / 2, height / 2, '#fff', 10, 0.05);
        return;
    }
    let damageTaken = (selectedHero.id === 'chronos') ? 1 : 2;
    playerHp -= damageTaken;
    playerHpBar.style.width = `${playerHp}%`;
    shakeScreen();
    if (playerHp <= 0) { alert("パイロット、ダウン！再起動します..."); location.reload(); }
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
    let damageMult = 1;
    let coinMult = 1;
    if (selectedHero.id === 'light' && word.romaji.length <= 4) damageMult *= 1.5;
    if (selectedHero.id === 'gravity' && word.romaji.length >= 8) damageMult *= 2.5;
    if (selectedHero.id === 'bullet') {
        const timeTaken = (Date.now() - wordStartTime) / 1000;
        const speedBonus = Math.max(0.5, 2 - timeTaken);
        coinMult *= speedBonus;
    }
    let damage = word.romaji.length * (5 + combo * 0.2) * damageMult;
    enemyHp -= damage;
    enemyHpBar.style.width = `${(enemyHp / selectedStage.hp) * 100}%`;
    let earned = Math.floor(word.romaji.length * 10 * (1 + combo * 0.05) * coinMult);
    userData.coins += earned;
    coinDisplay.innerText = userData.coins;
    saveGame();
    word.destroy();
    words = words.filter(w => w !== word);
    currentWordIndex = -1;
    typedCharsCount = 0;
    if (enemyHp <= 0) {
        alert("敵機撃破！");
        location.reload(); // Return to menu for now
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

// --- Init & Loop ---
loginBtn.onclick = handleLogin;
registerBtn.onclick = handleRegister;
guestBtn.onclick = handleGuest;
verifyBtn.onclick = handleVerify;
window.addEventListener('resize', resize);
window.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    stageScreen.classList.remove('hidden');
    initStageSelection();
});

resize(); initSelection();
function animate() {
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    while (particles.length < 100) particles.push(new Particle());
    words.forEach(w => w.update());
    requestAnimationFrame(animate);
}
animate();
