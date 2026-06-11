const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let isPaused = false;
let gameOver = false;
let score = 0;
let cash = 0;
let keys = {};
let mouse = { x: 0, y: 0, isDown: false };

let upgrades = {
    speedMultiplier: 1.0,
    fireRateMultiplier: 1.0,
    bonusPierce: 0,
    maxSlots: 1
};

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 4,
    health: 100,
    maxHealth: 100,
    currentWeaponIdx: 0,
    lastShotTime: 0,
    ownedWeapons: [0] // Fixed: Properly starts with the Pistol equipped
};

let bullets = [];
let enemies = [];
let particles = [];

const weapons = [
    { name: "Pistol", cost: 0, delay: 400, damage: 25, bSpeed: 10, count: 1, spread: 0, color: '#ffffff', desc: "Reliable sidearm. Simple but clean.", purchased: true },
    { name: "Dual Pistols", cost: 150, delay: 250, damage: 20, bSpeed: 11, count: 1, spread: 0.1, color: '#00ffcc', desc: "Faster firing rate with an alternating spray pattern.", purchased: false },
    { name: "Shotgun", cost: 400, delay: 800, damage: 15, bSpeed: 8, count: 6, spread: 0.4, color: '#ffcc00', desc: "Blasts 6 heavy pellets in a wide cone.", purchased: false },
    { name: "SMG Burst", cost: 650, delay: 120, damage: 12, bSpeed: 13, count: 1, spread: 0.15, color: '#ff33aa', desc: "Hyper fast automatic fire, slightly lower accuracy.", purchased: false },
    { name: "Sniper Rifle", cost: 1000, delay: 1200, damage: 150, bSpeed: 22, count: 1, spread: 0, color: '#ff3333', desc: "Ultra-high damage piercer with extreme velocity.", purchased: false },
    { name: "Plasma Spreader", cost: 1500, delay: 300, damage: 30, bSpeed: 7, count: 3, spread: 0.25, color: '#3399ff', desc: "Fires a trident of glowing high-energy plasma.", purchased: false },
    { name: "Heavy Cannon", cost: 2200, delay: 900, damage: 90, bSpeed: 6, count: 1, spread: 0, color: '#ff6600', desc: "Launches huge, devastating kinetic slugs.", purchased: false },
    { name: "Acid Tri-Shot", cost: 3500, delay: 400, damage: 25, bSpeed: 11, count: 3, spread: 0.1, color: '#33cc33', desc: "Fires three chemical streams in a tight group.", purchased: false },
    { name: "Wave Obliterator", cost: 5000, delay: 500, damage: 15, bSpeed: 9, count: 12, spread: 3.14, color: '#cc33ff', desc: "Fires a full 360-degree defensive ring blast.", purchased: false },
    { name: "Doomsday Laser", cost: 8000, delay: 50, damage: 40, bSpeed: 16, count: 2, spread: 0.05, color: '#ff0055', desc: "Experimental high-tech rapid-fire energy stream.", purchased: false }
];

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'p') toggleShop();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => { if(!isPaused) mouse.isDown = true; });
window.addEventListener('mouseup', () => mouse.isDown = false);
const shopBtn = document.getElementById('shop-btn');
const closeShopBtn = document.getElementById('close-shop-btn');
const shopModal = document.getElementById('shop-modal');
const restartBtn = document.getElementById('restart-btn');

shopBtn.addEventListener('click', toggleShop);
closeShopBtn.addEventListener('click', toggleShop);
restartBtn.addEventListener('click', resetGame);

function toggleShop() {
    if (gameOver) return;
    isPaused = !isPaused;
    shopModal.style.display = isPaused ? 'block' : 'none';
    if (isPaused) { mouse.isDown = false; renderShop(); }
}

function renderShop() {
    document.getElementById('shop-cash').innerText = cash;
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    weapons.forEach((wpn, idx) => {
        const card = document.createElement('div');
        card.className = 'weapon-card';

        let buttonText = `Buy ($${wpn.cost})`;
        let isDisabled = cash < wpn.cost;
        let isCurrentlyEquipped = player.currentWeaponIdx === idx && player.ownedWeapons.includes(idx);
        let unequipButtonHtml = '';

        if (wpn.purchased) {
            if (isCurrentlyEquipped) {
                buttonText = "EQUIPPED";
                isDisabled = true;
                if (player.ownedWeapons.length > 1) {
                    unequipButtonHtml = `<button class="buy-btn unequip-btn" onclick="unequipWeapon(${idx})">UNEQUIP</button>`;
                }
            } else if (player.ownedWeapons.includes(idx)) {
                buttonText = "EQUIP";
                isDisabled = false;
                unequipButtonHtml = `<button class="buy-btn unequip-btn" onclick="unequipWeapon(${idx})">UNEQUIP</button>`;
            } else {
                if (player.ownedWeapons.length >= upgrades.maxSlots) {
                    buttonText = "SLOTS FULL";
                    isDisabled = true;
                } else {
                    buttonText = "EQUIP";
                    isDisabled = false;
                }
            }
        } else {
            if (player.ownedWeapons.length >= upgrades.maxSlots) {
                buttonText = "NO SLOTS";
                isDisabled = true;
            }
        }

        card.innerHTML = `
            <div>
                <div class="weapon-name">${wpn.name}</div>
                <div class="weapon-desc">${wpn.desc}</div>
                <div style="font-size:11px; color:#888;">Damage: ${wpn.damage} | Speed: ${Math.round(wpn.bSpeed * upgrades.speedMultiplier)}</div>
            </div>
            <div>
                <button class="buy-btn ${isCurrentlyEquipped ? 'equipped' : ''}" 
                    ${isDisabled ? 'disabled' : ''} onclick="buyOrEquip(${idx})">
                    ${buttonText}
                </button>
                ${unequipButtonHtml}
            </div>
        `;
        grid.appendChild(card);
    });
    
    let slotBtn = document.getElementById('slot-upgrade-btn');
    if(slotBtn) {
        if(upgrades.maxSlots >= 3) { 
            slotBtn.innerText = "Weapon Slots Maxed out!"; 
            slotBtn.disabled = true; 
        } else { 
            slotBtn.innerText = `Unlock Weapon Slot (Current: ${upgrades.maxSlots}/3) - $1000`; 
        }
    }
}

window.buyOrEquip = function(idx) {
    const wpn = weapons[idx];
    if (!wpn.purchased && cash >= wpn.cost && player.ownedWeapons.length < upgrades.maxSlots) {
        cash -= wpn.cost;
        wpn.purchased = true;
        player.ownedWeapons.push(idx);
        player.currentWeaponIdx = idx;
    } else if (wpn.purchased && !player.ownedWeapons.includes(idx) && player.ownedWeapons.length < upgrades.maxSlots) {
        player.ownedWeapons.push(idx);
        player.currentWeaponIdx = idx;
    } else if (wpn.purchased && player.ownedWeapons.includes(idx)) {
        player.currentWeaponIdx = idx;
    }
    renderShop();
    updateUI();
};

window.unequipWeapon = function(idx) {
    if (player.ownedWeapons.length <= 1) return;

    const slotIndex = player.ownedWeapons.indexOf(idx);
    if (slotIndex > -1) {
        player.ownedWeapons.splice(slotIndex, 1);
        if (player.currentWeaponIdx === idx) {
            player.currentWeaponIdx = player.ownedWeapons[0];
        }
    }
    renderShop();
    updateUI();
};

window.buyGlobalUpgrade = function(type) {
    if(type === 'speed' && cash >= 300) { 
        cash -= 300; 
        upgrades.speedMultiplier += 0.15; 
    } else if(type === 'firerate' && cash >= 400) { 
        cash -= 400; 
        upgrades.fireRateMultiplier += 0.20; 
    } else if(type === 'pierce' && cash >= 500) { 
        cash -= 500; 
        upgrades.bonusPierce += 1; 
    } else if(type === 'slots' && cash >= 1000 && upgrades.maxSlots < 3) { 
        cash -= 1000; 
        upgrades.maxSlots += 1; 
    }
    renderShop();
    updateUI();
};

window.submitCheatCode = function() {
    const input = document.getElementById('cheat-input-field');
    if (input && input.value === "Mky") {
        cash += 600000;
        input.value = '';
        alert("Cheat Activated! Added $600,000 Cash!");
        renderShop();
        updateUI();
    } else {
        alert("Incorrect code setup.");
    }
};

function updateUI() {
    document.getElementById('ui-health').innerText = Math.max(0, Math.floor(player.health));
    document.getElementById('ui-score').innerText = score;
    document.getElementById('ui-cash').innerText = cash;
    
    if (player.ownedWeapons.length > 0) {
        document.getElementById('ui-weapon').innerText = weapons[player.currentWeaponIdx].name;
    } else {
        document.getElementById('ui-weapon').innerText = "None";
    }
}
function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

let lastSpawnTime = 0;
function spawnEnemies(timestamp) {
    if (timestamp - lastSpawnTime > Math.max(400, 1500 - score * 0.5)) {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -30 : canvas.width + 30; y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width; y = Math.random() < 0.5 ? -30 : canvas.height + 30;
        }
        let typeRand = Math.random();
        let enemyType = { hp: 30, speed: 2, radius: 15, color: '#ff3333', reward: 15 };
        if (score > 300 && typeRand > 0.75) enemyType = { hp: 80, speed: 1.2, radius: 24, color: '#ffcc00', reward: 40 };
        else if (score > 700 && typeRand < 0.20) enemyType = { hp: 20, speed: 3.8, radius: 10, color: '#cc33ff', reward: 30 };
        enemies.push({ x, y, ...enemyType });
        lastSpawnTime = timestamp;
    }
}

function fireActiveWeapon(timestamp) {
    if (player.ownedWeapons.length === 0) return;
    
    const wpn = weapons[player.currentWeaponIdx];
    let upgradedDelay = wpn.delay / upgrades.fireRateMultiplier;

    if (timestamp - player.lastShotTime > upgradedDelay) {
        let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        for (let i = 0; i < wpn.count; i++) {
            let finalAngle = angle + (Math.random() - 0.5) * wpn.spread;
            bullets.push({
                x: player.x + Math.cos(angle) * player.radius,
                y: player.y + Math.sin(angle) * player.radius,
                vx: Math.cos(finalAngle) * (wpn.bSpeed * upgrades.speedMultiplier),
                vy: Math.sin(finalAngle) * (wpn.bSpeed * upgrades.speedMultiplier),
                radius: wpn.name.includes("Heavy") ? 8 : 4,
                damage: wpn.damage,
                color: wpn.color,
                pierceLeft: upgrades.bonusPierce,
                hitEnemies: []
            });
        }
        player.lastShotTime = timestamp;
    }
}

function update(timestamp) {
    if (isPaused || gameOver) return;
    let moveX = 0; let moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    if (moveX !== 0 && moveY !== 0) { moveX *= 0.7071; moveY *= 0.7071; }
    player.x += moveX * player.speed; player.y += moveY * player.speed;
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    if (mouse.isDown) fireActiveWeapon(timestamp);

    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        let b = bullets[bIdx]; b.x += b.vx; b.y += b.vy;
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) { bullets.splice(bIdx, 1); }
    }

    spawnEnemies(timestamp);
    enemies.forEach((enemy, eIdx) => {
        let angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed; enemy.y += Math.sin(angle) * enemy.speed;
        let distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer < player.radius + enemy.radius) {
            player.health -= 0.4; updateUI();
            if (player.health <= 0) {
                gameOver = true; document.getElementById('game-over-screen').style.display = 'flex';
                document.getElementById('final-score').innerText = score;
            }
        }
        bullets.forEach((bullet, bIdx) => {
            if (bullet.hitEnemies.includes(enemy)) return;
            let distToBullet = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
            if (distToBullet < enemy.radius + bullet.radius) {
                enemy.hp -= bullet.damage; createExplosion(bullet.x, bullet.y, bullet.color);
                bullet.hitEnemies.push(enemy);
                if (bullet.pierceLeft <= 0) { bullets.splice(bIdx, 1); } else { bullet.pierceLeft--; }
                if (enemy.hp <= 0) {
                    createExplosion(enemy.x, enemy.y, enemy.color);
                    score += 10; cash += enemy.reward; enemies.splice(eIdx, 1); updateUI();
                }
            }
        });
    });
    particles.forEach((p, index) => { p.x += p.vx; p.y += p.vy; p.alpha -= p.decay; if (p.alpha <= 0) particles.splice(index, 1); });
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#232329'; ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    bullets.forEach(b => {
        ctx.fillStyle = b.color; ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    enemies.forEach(e => {
        ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.6, 0, Math.PI * 2); ctx.fill();
    });
    particles.forEach(p => { ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });

    if (!gameOver) {
        ctx.save(); ctx.translate(player.x, player.y);
        let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x); ctx.rotate(angle);
        ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 15; ctx.shadowColor = '#00ffcc';
        ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -5, player.radius + 12, 10); ctx.restore(); ctx.shadowBlur = 0;

        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y);
        ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y - 5);
        ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 15);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#00ffcc'; ctx.fill();
    }
}

function gameLoop(timestamp) { update(timestamp); render(); requestAnimationFrame(gameLoop); }

function resetGame() {
    score = 0; cash = 0; gameOver = false; isPaused = false;
    upgrades = { speedMultiplier: 1.0, fireRateMultiplier: 1.0, bonusPierce: 0, maxSlots: 1 };
    player.health = player.maxHealth; player.x = canvas.width / 2; player.y = canvas.height / 2;
    player.currentWeaponIdx = 0; 
    player.ownedWeapons = [0]; // Fixed: Resets back to base weapon list values
    weapons.forEach((w, idx) => w.purchased = idx === 0);
    bullets = []; enemies = []; particles = [];
    document.getElementById('game-over-screen').style.display = 'none';
    shopModal.style.display = 'none'; updateUI();
}

updateUI();
requestAnimationFrame(gameLoop);
