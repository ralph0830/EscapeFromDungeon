import { Room, Client } from "colyseus";
import { GameState, Player } from "../schema/GameState";

export class GameRoom extends Room<GameState> {
    onCreate(options: any) {
        this.setState(new GameState());

        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
            }
        });

        this.onMessage("rotate", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.rotation = data.rotation;
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        // Random start position
        const x = Math.random() * 800;
        const y = Math.random() * 600;
        this.state.players.set(client.sessionId, new Player(x, y));
    }

    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log("room disposed!");
    }
}
