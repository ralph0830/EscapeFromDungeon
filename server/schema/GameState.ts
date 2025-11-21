import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") rotation: number;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.rotation = 0;
    }
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}
