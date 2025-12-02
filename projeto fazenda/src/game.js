const TILE_SIZE = 32;

// --- CLASSE NPC (IA Simples) ---
class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.body.setImmovable(true);
        
        // Timer de movimento
        scene.time.addEvent({ delay: 3000, callback: this.moveRandomly, callbackScope: this, loop: true });
        this.moveRandomly();
        
        // Balão de fala
        this.speechBubble = scene.add.text(x, y - 20, "", { fontSize: '10px', fill: '#fff', backgroundColor: '#000' }).setOrigin(0.5);
        this.speechBubble.setVisible(false);
    }

    moveRandomly() {
        const dirs = [0, 90, 180, 270, 999]; // 999 = Parar
        const dir = Phaser.Utils.Array.GetRandom(dirs);
        
        if (dir === 999) {
            this.setVelocity(0);
        } else {
            this.scene.physics.velocityFromAngle(dir, 30, this.body.velocity);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.speechBubble.setPosition(this.x, this.y - 25);
    }

    talk() {
        const phrases = ["Belo dia!", "Viu minha vaca?", "Preciso de madeira...", "Ola vizinho!"];
        this.speechBubble.setText(Phaser.Utils.Array.GetRandom(phrases));
        this.speechBubble.setVisible(true);
        this.scene.time.delayedCall(3000, () => { this.speechBubble.setVisible(false); });
    }
}

// --- CENA PRINCIPAL ---
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.inventory = { wood: 0, stone: 0, money: 0 };
        this.energy = 100;
        this.currentTool = 0; // Começa com a Mão (id 0 = Tecla 1)
        this.mapData = {}; 
    }

    preload() {
        // --- GERADOR DE TEXTURAS ---
        const g = this.make.graphics({x:0, y:0, add:false});

        // 1. Grama
        g.fillStyle(0x567d46); g.fillRect(0,0,32,32);
        g.fillStyle(0x4a6b3c); g.fillRect(0,0,32,2); g.fillRect(0,0,2,32);
        g.generateTexture('grass', 32, 32);

        // 2. Terra
        g.clear(); g.fillStyle(0x5d4037); g.fillRect(1,1,30,30);
        g.generateTexture('soil', 32, 32);

        // 3. Arvore
        g.clear(); g.fillStyle(0x000000, 0.2); g.fillCircle(16,28,10);
        g.fillStyle(0x795548); g.fillRect(12, 16, 8, 16);
        g.fillStyle(0x2e7d32); g.fillCircle(16, 12, 12);
        g.generateTexture('tree', 32, 32);

        // 4. Pedra
        g.clear(); g.fillStyle(0x000000, 0.2); g.fillCircle(16,28,10);
        g.fillStyle(0x9e9e9e); g.fillCircle(16, 20, 10);
        g.fillStyle(0x757575); g.fillCircle(22, 24, 6);
        g.generateTexture('rock', 32, 32);

        // 5. Player
        g.clear(); g.fillStyle(0xffcc80); g.fillRect(8,8,16,16);
        g.fillStyle(0x1976d2); g.fillRect(8,24,16,8);
        g.generateTexture('player', 32, 32);

        // 6. Vaca
        g.clear(); g.fillStyle(0xffffff); g.fillRect(4,10,24,14);
        g.fillStyle(0x000000); g.fillRect(6,12,6,6); g.fillRect(18,14,4,4);
        g.generateTexture('cow', 32, 32);

        // 7. NPC
        g.clear(); g.fillStyle(0xffcc80); g.fillRect(8,4,16,14);
        g.fillStyle(0xe65100); g.fillRect(8,18,16,14);
        g.generateTexture('npc', 32, 32);

        // 8. Parede
        g.clear(); g.fillStyle(0x8d6e63); g.fillRect(0,0,32,32);
        g.lineStyle(2,0x5d4037); g.strokeRect(0,0,32,32);
        g.generateTexture('wall', 32, 32);

        // 9. Cama
        g.clear(); g.fillStyle(0xef5350); g.fillRect(4,4,24,24);
        g.fillStyle(0xffffff); g.fillRect(4,4,24,8);
        g.generateTexture('bed', 32, 32);
    }

    create() {
        // --- MUNDO ---
        this.add.tileSprite(0, 0, 3000, 3000, 'grass').setOrigin(0);
        this.obstacles = this.physics.add.staticGroup();
        
        // Gerador de Natureza
        for(let i=0; i<50; i++) {
            let x = Math.floor(Phaser.Math.Between(100, 1900)/TILE_SIZE)*TILE_SIZE;
            let y = Math.floor(Phaser.Math.Between(100, 1900)/TILE_SIZE)*TILE_SIZE;
            this.createObject(x, y, 'tree');
        }
        for(let i=0; i<30; i++) {
            let x = Math.floor(Phaser.Math.Between(100, 1900)/TILE_SIZE)*TILE_SIZE;
            let y = Math.floor(Phaser.Math.Between(100, 1900)/TILE_SIZE)*TILE_SIZE;
            this.createObject(x, y, 'rock');
        }

        // --- PLAYER ---
        this.player = this.physics.add.sprite(400, 300, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        this.physics.add.collider(this.player, this.obstacles);

        // --- NPCs ---
        this.npcs = this.physics.add.group();
        let cow = new NPC(this, 500, 400, 'cow'); cow.type = 'animal'; this.npcs.add(cow);
        let villager = new NPC(this, 600, 400, 'npc'); villager.type = 'human'; this.npcs.add(villager);
        this.physics.add.collider(cow, this.obstacles);
        this.physics.add.collider(villager, this.obstacles);
        this.physics.add.collider(this.player, this.npcs);

        // --- CÂMERA ---
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.5);
        this.cameras.main.setBounds(0,0,2000,2000);

        this.selector = this.add.rectangle(0,0,32,32,0xffffff,0.4).setOrigin(0).setDepth(100);
        this.dayNightOverlay = this.add.rectangle(0,0,3000,3000,0x000033,0).setOrigin(0).setDepth(90);
        
        // --- CONTROLES (CORRIGIDO) ---
        // Mouse: Garante que clicar no jogo devolve o foco para o teclado
        this.input.on('pointerdown', (pointer) => {
            this.game.canvas.focus();
            this.handleInput(pointer);
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        // Mapeamento MANUAL das teclas numéricas para garantir que funcionem
        this.keys = {
            one: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
            two: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
            three: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
            four: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
            five: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
            six: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
            // Suporte para Numpad
            num1: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE),
            num2: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO),
            num3: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE),
            num4: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR),
            num5: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE),
            num6: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX),
        };

        // Relógio
        this.gameTime = 0;
        this.time.addEvent({ delay: 1000, callback: this.updateTime, callbackScope: this, loop: true });
    }

    update() {
        // --- CHECAGEM DE TECLAS (Loop constante) ---
        // Isso é muito mais confiável que Event Listeners
        if (Phaser.Input.Keyboard.JustDown(this.keys.one) || Phaser.Input.Keyboard.JustDown(this.keys.num1)) this.setTool(0);
        if (Phaser.Input.Keyboard.JustDown(this.keys.two) || Phaser.Input.Keyboard.JustDown(this.keys.num2)) this.setTool(1);
        if (Phaser.Input.Keyboard.JustDown(this.keys.three) || Phaser.Input.Keyboard.JustDown(this.keys.num3)) this.setTool(2);
        if (Phaser.Input.Keyboard.JustDown(this.keys.four) || Phaser.Input.Keyboard.JustDown(this.keys.num4)) this.setTool(3);
        if (Phaser.Input.Keyboard.JustDown(this.keys.five) || Phaser.Input.Keyboard.JustDown(this.keys.num5)) this.setTool(4);
        if (Phaser.Input.Keyboard.JustDown(this.keys.six) || Phaser.Input.Keyboard.JustDown(this.keys.num6)) this.setTool(5);

        if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
             const map = document.getElementById('big-map-container');
             map.style.display = map.style.display === 'none' ? 'flex' : 'none';
        }

        // Movimento
        const speed = 150;
        this.player.setVelocity(0);
        let dx=0, dy=0;
        
        if(this.wasd.A.isDown || this.cursors.left.isDown) dx = -1;
        else if(this.wasd.D.isDown || this.cursors.right.isDown) dx = 1;
        
        if(this.wasd.W.isDown || this.cursors.up.isDown) dy = -1;
        else if(this.wasd.S.isDown || this.cursors.down.isDown) dy = 1;

        if(dx!==0 || dy!==0) {
            let vec = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
            this.player.setVelocity(vec.x, vec.y);
        }

        // Seletor
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
        const tx = Math.floor(worldPoint.x / TILE_SIZE) * TILE_SIZE;
        const ty = Math.floor(worldPoint.y / TILE_SIZE) * TILE_SIZE;
        this.selector.setPosition(tx, ty);
        this.selector.fillColor = (this.energy > 0) ? 0xffffff : 0xff0000;
    }

    // --- LÓGICA ---
    updateTime() {
        this.gameTime++;
        const cycle = this.gameTime % 100;
        if (cycle > 60) this.dayNightOverlay.alpha = 0.5; 
        else this.dayNightOverlay.alpha = 0;
    }

    createObject(x, y, type) {
        let obj;
        const key = `${x},${y}`;
        if (this.mapData[key]) return;

        if (type === 'tree' || type === 'rock' || type === 'wall') {
            obj = this.obstacles.create(x + 16, y + 16, type);
            obj.body.updateFromGameObject();
        } else {
            obj = this.add.image(x, y, type).setOrigin(0);
        }
        this.mapData[key] = { type: type, obj: obj, hp: 3 };
    }

    handleInput(pointer) {
        if (pointer.event.target.closest('.slot')) return;

        const worldPoint = pointer.positionToCamera(this.cameras.main);
        const tx = Math.floor(worldPoint.x / TILE_SIZE) * TILE_SIZE;
        const ty = Math.floor(worldPoint.y / TILE_SIZE) * TILE_SIZE;
        const key = `${tx},${ty}`;
        const target = this.mapData[key];

        // 0. MÃO
        if (this.currentTool === 0) {
            this.npcs.getChildren().forEach(npc => {
                if (Phaser.Math.Distance.Between(tx, ty, npc.x, npc.y) < 50) {
                    if (npc.type === 'human') npc.talk();
                    if (npc.type === 'animal') {
                        npc.speechBubble.setText("Muuuu!");
                        npc.speechBubble.setVisible(true);
                        this.time.delayedCall(1000, () => npc.speechBubble.setVisible(false));
                    }
                }
            });
        }

        if (this.currentTool > 0 && this.currentTool < 5) {
            if (this.energy <= 0) {
                this.cameras.main.shake(100, 0.01);
                return; 
            }
            this.modifyEnergy(-5);
        }

        // 1. MACHADO
        if (this.currentTool === 1) {
            if (target && target.type === 'tree') {
                target.hp--;
                this.tweens.add({ targets: target.obj, alpha: 0.5, yoyo: true, duration: 100 });
                if (target.hp <= 0) {
                    target.obj.destroy();
                    delete this.mapData[key];
                    this.inventory.wood++;
                    this.updateUI();
                }
            }
        }
        // 2. PICARETA
        else if (this.currentTool === 2) {
            if (target && target.type === 'rock') {
                target.hp--;
                this.tweens.add({ targets: target.obj, alpha: 0.5, yoyo: true, duration: 100 });
                if (target.hp <= 0) {
                    target.obj.destroy();
                    delete this.mapData[key];
                    this.inventory.stone++;
                    this.updateUI();
                }
            }
        }
        // 4. CONSTRUIR
        else if (this.currentTool === 4) {
            if (this.inventory.wood >= 5 && !target) {
                this.inventory.wood -= 5;
                this.createObject(tx, ty, 'wall');
                this.updateUI();
            }
        }
        // 5. DORMIR
        else if (this.currentTool === 5) {
            if (!target && this.inventory.wood >= 10) {
                 this.inventory.wood -= 10;
                 let bed = this.add.image(tx, ty, 'bed').setOrigin(0);
                 this.mapData[key] = { type: 'bed', obj: bed };
                 this.updateUI();
            }
            else if (target && target.type === 'bed') {
                this.cameras.main.fadeOut(1000, 0, 0, 0);
                this.time.delayedCall(1000, () => {
                    this.energy = 100;
                    this.updateUI();
                    this.dayNightOverlay.alpha = 0; 
                    this.cameras.main.fadeIn(1000);
                });
            }
        }
    }

    modifyEnergy(amount) {
        this.energy += amount;
        if (this.energy < 0) this.energy = 0;
        if (this.energy > 100) this.energy = 100;
        this.updateUI();
    }

    setTool(id) {
        this.currentTool = id;
        if(window.selectTool) window.selectTool(id);
    }

    updateUI() {
        const woodEl = document.getElementById('wood-count');
        const stoneEl = document.getElementById('stone-count');
        const moneyEl = document.getElementById('money-display');
        const energyEl = document.getElementById('energy-bar');
        
        if (woodEl) woodEl.innerText = this.inventory.wood;
        if (stoneEl) stoneEl.innerText = this.inventory.stone;
        if (moneyEl) moneyEl.innerText = this.inventory.money;
        if (energyEl) energyEl.style.width = this.energy + '%';
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2d2d2d',
    parent: document.body,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);
window.gameInstance = game;

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});