import Phaser from 'phaser';
import * as Colyseus from 'colyseus.js';
import PhaserRaycaster from 'phaser-raycaster';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.client = new Colyseus.Client('ws://localhost:4001');
        this.room = null;
        this.players = {};
        this.cursors = null;
        this.raycaster = null;
        this.ray = null;
        this.graphics = null;
        this.obstacles = null;
        this.fog = null;
        this.lightGraphics = null;
    }

    preload() {
        this.load.spritesheet('player', '/assets/player.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('tiles', '/assets/tileset.png');
    }

    async create() {
        console.log("Joining room...");

        // Create animations
        if (!this.anims.exists('idle')) {
            this.anims.create({
                key: 'idle',
                frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
                frameRate: 10,
                repeat: -1
            });
        }
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });
        }

        try {
            this.room = await this.client.joinOrCreate("game_room");
            console.log("Joined successfully!", this.room);

            // Raycaster Init
            if (this.raycasterPlugin && typeof this.raycasterPlugin.createRaycaster === 'function') {
                this.raycaster = this.raycasterPlugin.createRaycaster({ debug: false });
            } else {
                this.raycaster = this.plugins.get('phaser-raycaster').createRaycaster({ debug: false });
            }

            if (this.raycaster) {
                this.ray = this.raycaster.createRay({ origin: { x: 400, y: 300 } });
                this.ray.setConeDeg(60);
                this.ray.setRayRange(300);
            }

            // Map
            const map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 40, height: 30 });
            const tileset = map.addTilesetImage('tiles', null, 32, 32);
            const layer = map.createBlankLayer('Ground', tileset);
            layer.randomize(0, 0, map.width, map.height, [0, 1, 2]);

            // Walls
            this.obstacles = this.add.group();
            for (let i = 0; i < 20; i++) {
                const wx = Phaser.Math.Between(2, 38);
                const wy = Phaser.Math.Between(2, 28);
                const wallTile = layer.putTileAt(3, wx, wy);
                wallTile.setCollision(true);
            }
            map.setCollision([3]);

            if (this.raycaster) {
                this.raycaster.mapGameObjects(layer, false, { collisionTiles: [3] });
            }

            // Fog (Removed blocking rectangle, using tint)
            layer.setTint(0x222222);

            // Light Layer (Visuals)
            this.lightGraphics = this.add.graphics({ fillStyle: { color: 0xffffff, alpha: 0.3 } });
            this.lightGraphics.setBlendMode(Phaser.BlendModes.ADD);
            this.lightGraphics.setDepth(10);

            // Players
            this.room.state.players.onAdd((player, sessionId) => {
                const entity = this.physics.add.sprite(player.x, player.y, 'player');
                entity.setOrigin(0.5, 0.5);
                entity.play('idle');
                this.players[sessionId] = entity;
                this.physics.add.collider(entity, layer);

                player.onChange(() => {
                    if (sessionId !== this.room.sessionId) {
                        entity.x = player.x;
                        entity.y = player.y;
                        entity.rotation = player.rotation || 0;
                    }
                });
            });

            this.room.state.players.onRemove((player, sessionId) => {
                const entity = this.players[sessionId];
                if (entity) {
                    entity.destroy();
                    delete this.players[sessionId];
                }
            });

            // Input
            this.cursors = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });

            this.input.on('pointermove', (pointer) => {
                const myPlayer = this.players[this.room.sessionId];
                if (myPlayer) {
                    const angle = Phaser.Math.Angle.Between(myPlayer.x, myPlayer.y, pointer.x, pointer.y);
                    myPlayer.rotation = angle;
                    this.room.send("rotate", { rotation: angle });
                }
            });

        } catch (e) {
            console.error("Join error", e);
        }
    }

    update() {
        if (!this.room) return;
        const speed = 150;
        let moved = false;
        const myPlayer = this.players[this.room.sessionId];

        if (myPlayer) {
            myPlayer.setVelocity(0);
            if (this.cursors.left.isDown) { myPlayer.setVelocityX(-speed); moved = true; }
            else if (this.cursors.right.isDown) { myPlayer.setVelocityX(speed); moved = true; }

            if (this.cursors.up.isDown) { myPlayer.setVelocityY(-speed); moved = true; }
            else if (this.cursors.down.isDown) { myPlayer.setVelocityY(speed); moved = true; }

            if (moved) {
                this.room.send("move", { x: myPlayer.x, y: myPlayer.y });
                myPlayer.play('walk', true);
            } else {
                myPlayer.play('idle', true);
            }

            if (this.ray) {
                this.ray.setOrigin(myPlayer.x, myPlayer.y);
                this.ray.setAngle(myPlayer.rotation);
                const intersections = this.ray.castCone();
                this.lightGraphics.clear();
                this.lightGraphics.fillStyle(0xffffff, 0.5);
                this.lightGraphics.fillPoints(intersections);
            }
        }
    }
}
