import Client from "../Client";
import { tps } from "../config";
import { DevTank } from "../Const/DevTankDefinitions";
import { ArenaFlags, Color, ColorsHexCode, ValidScoreboardIndex } from "../Const/Enums";
import MazeWall from "../Entity/Misc/MazeWall";
import TeamBase from "../Entity/Misc/TeamBase";
import { TeamEntity } from "../Entity/Misc/TeamEntity";
import Nexus, { NexusConfig } from "../Entity/Misc/TeamNexus";
import AbstractShape from "../Entity/Shape/AbstractShape";
import ShapeManager from "../Entity/Shape/Manager";
import Pentagon from "../Entity/Shape/Pentagon";
import Square from "../Entity/Shape/Square";
import Triangle from "../Entity/Shape/Triangle";
import TankBody from "../Entity/Tank/TankBody";
import GameServer from "../Game";
import ArenaEntity, { ArenaState } from "../Native/Arena";
import ClientCamera from "../Native/Camera";
import { Entity } from "../Native/Entity";
import { removeFast } from "../util";


const ARENA_SIZE = 16000;
const BASE_SIZE = ARENA_SIZE / 8;

const NEXUS_CONFIG: NexusConfig = {
    health: 100000,
    shield: 10000,
    size: 150
}

class EventShapeManager extends ShapeManager {
    private redShapeEntities: AbstractShape[] = [];
    private blueShapeEntities: AbstractShape[] = [];

    private spawnMineShape(base: TeamBase): AbstractShape {
        const r = Math.random();
        let shape;
        if(r > 0.7) shape = new Pentagon(this.game, Math.random() > 0.99);
        else if(r > 0.5) shape = new Triangle(this.game);
        else shape = new Square(this.game);
        const offsetX = Math.random() * BASE_SIZE / 2;
        const offsetY = Math.random() * BASE_SIZE / 2;
        shape.positionData.x = base.positionData.x + (Math.random() > 0.5 ? offsetX : -offsetX);
        shape.positionData.y = base.positionData.y + (Math.random() > 0.5 ? offsetY : -offsetY);
        shape.relationsData.owner = shape.relationsData.team = this.arena;
        return shape;
    }

    protected get wantedShapes() {
        return 150;
    }

    public tick() {
        const arena = this.arena as unknown as EventArena;

        for(let i = 0; i < this.wantedShapes; ++i) {
            if(!this.redShapeEntities[i]) this.redShapeEntities.push(this.spawnMineShape(arena.mineBaseRed));
            else if(!Entity.exists(this.redShapeEntities[i])) removeFast(this.redShapeEntities, i); // deal with this next tick :P
        }

        for(let i = 0; i < this.wantedShapes; ++i) {
            if(!this.blueShapeEntities[i]) this.blueShapeEntities.push(this.spawnMineShape(arena.mineBaseBlue));
            else if(!Entity.exists(this.blueShapeEntities[i])) removeFast(this.blueShapeEntities, i); // deal with this next tick :P
        }
    }
}

export default class EventArena extends ArenaEntity {
    public redTeam: TeamEntity = new TeamEntity(this.game, Color.TeamBlue);
    public blueTeam: TeamEntity = new TeamEntity(this.game, Color.TeamRed);

    public mineBaseRed: TeamBase = new TeamBase(
        this.game,
        this.redTeam,
        -ARENA_SIZE / 2 + BASE_SIZE / 2,
        0,
        BASE_SIZE,
        BASE_SIZE,
        true
    );
    public mineBaseBlue: TeamBase = new TeamBase(
        this.game,
        this.blueTeam,
        ARENA_SIZE / 2 - BASE_SIZE / 2,
        0,
        BASE_SIZE,
        BASE_SIZE,
        true
    );
    
    public spawnBaseRed: TeamBase = new TeamBase(
        this.game,
        this.redTeam,
        -ARENA_SIZE / 2 + BASE_SIZE / 2,
        -ARENA_SIZE / 2 + BASE_SIZE / 2,
        BASE_SIZE,
        BASE_SIZE,
        true
    );
    public spawnBaseBlue: TeamBase = new TeamBase(
        this.game,
        this.blueTeam,
        ARENA_SIZE / 2 - BASE_SIZE / 2,
        ARENA_SIZE / 2 - BASE_SIZE / 2,
        BASE_SIZE,
        BASE_SIZE,
        true
    );

    public nexusBaseRed: TeamBase = new TeamBase(
        this.game,
        this.redTeam,
        0,
        -ARENA_SIZE / 2 + BASE_SIZE / 2,
        BASE_SIZE,
        BASE_SIZE,
        false
    );
    public nexusBaseBlue: TeamBase = new TeamBase(
        this.game,
        this.blueTeam,
        0,
        ARENA_SIZE / 2 - BASE_SIZE / 2,
        BASE_SIZE,
        BASE_SIZE,
        false
    );

    public redNexus: Nexus = new Nexus(
        this.game,
        this.nexusBaseRed.positionData.x,
        this.nexusBaseRed.positionData.y,
        this.redTeam,
        NEXUS_CONFIG,
        this.nexusBaseRed,
        this.spawnBaseRed,
        this.mineBaseRed
    );
    public blueNexus: Nexus = new Nexus(
        this.game,
        this.nexusBaseBlue.positionData.x,
        this.nexusBaseBlue.positionData.y,
        this.blueTeam,
        NEXUS_CONFIG,
        this.nexusBaseBlue,
        this.spawnBaseBlue,
        this.mineBaseBlue
    );

    public playerTeamMap: Map<Client, Nexus> = new Map();
    public shapes: EventShapeManager = new EventShapeManager(this);

    public invincibilityTimeLeft = tps * 60 * 5;

    constructor(game: GameServer) {
        super(game);
        this.updateBounds(ARENA_SIZE, ARENA_SIZE);

        new MazeWall(game, 0, -ARENA_SIZE / 2 + BASE_SIZE * 1.5, BASE_SIZE / 2.5, BASE_SIZE * 1.5);

        new MazeWall(game, -ARENA_SIZE / 2 + BASE_SIZE * 1.5, BASE_SIZE * 1.4, BASE_SIZE * 1.8, BASE_SIZE / 2.5);
        new MazeWall(game, -ARENA_SIZE / 2 + BASE_SIZE * 1.5, -BASE_SIZE * 1.4, BASE_SIZE * 1.8, BASE_SIZE / 2.5);

        new MazeWall(game, -ARENA_SIZE / 2 + BASE_SIZE * 0.875 - this.ARENA_PADDING, ARENA_SIZE / 2 - BASE_SIZE * 0.875 + this.ARENA_PADDING, BASE_SIZE * 1.75 + this.ARENA_PADDING, BASE_SIZE * 1.75 + this.ARENA_PADDING);

        // mirrored

        new MazeWall(game, 0, ARENA_SIZE / 2 - BASE_SIZE * 1.5, BASE_SIZE / 2.5, BASE_SIZE * 1.5);

        new MazeWall(game, ARENA_SIZE / 2 - BASE_SIZE * 1.5, BASE_SIZE * 1.4, BASE_SIZE * 1.8, BASE_SIZE / 2.5);
        new MazeWall(game, ARENA_SIZE / 2 - BASE_SIZE * 1.5, -BASE_SIZE * 1.4, BASE_SIZE * 1.8, BASE_SIZE / 2.5);

        new MazeWall(game, ARENA_SIZE / 2 - BASE_SIZE * 0.875 + this.ARENA_PADDING, -ARENA_SIZE / 2 + BASE_SIZE * 0.875 - this.ARENA_PADDING, BASE_SIZE * 1.75 + this.ARENA_PADDING, BASE_SIZE * 1.75 + this.ARENA_PADDING);

        this.blueNexus.setInvicibility(true);
        this.redNexus.setInvicibility(true);
    }

    public spawnPlayer(tank: TankBody, client: Client) {
        let team = this.playerTeamMap.get(client);

        findTeam: {
            if(team) break findTeam;
            if(!Entity.exists(this.blueNexus) && Entity.exists(this.redNexus)) {
                team = this.redNexus;
                break findTeam;
            } else if(!Entity.exists(this.redNexus) && Entity.exists(this.blueNexus)) {
                team = this.blueNexus;
                break findTeam;
            }
            let blue = 0, red = 0;
            for(const [client, nexus] of this.playerTeamMap.entries()) {
                if(client.terminated) {
                    this.playerTeamMap.delete(client);
                    continue;
                } 
                if(nexus === this.blueNexus) ++blue;
                else ++red;
            }
            if(red === blue) team = [this.blueNexus, this.redNexus][0 | Math.random() * 2];
            else if(red < blue) team = this.redNexus;
            else team = this.blueNexus;
        }

        this.playerTeamMap.set(client, team);

        if(!Entity.exists(team)) {
            tank.setTank(DevTank.Spectator);
            if(client.camera) client.camera.cameraData.respawnLevel = 0;
            tank.positionData.x = 0;
            tank.positionData.y = 0;

            return;
        }

        const xOffset = (Math.random() - 0.5) * BASE_SIZE,
            yOffset = (Math.random() - 0.5) * BASE_SIZE;
                
        const base = team.spawnBase;
        tank.relationsData.values.team = base.relationsData.values.team;
        tank.styleData.values.color = base.styleData.values.color;
        tank.positionData.values.x = base.positionData.values.x + xOffset;
        tank.positionData.values.y = base.positionData.values.y + yOffset;
        if (client.camera) client.camera.relationsData.team = tank.relationsData.values.team;
    }

    protected updateScoreboard(): void {
        const writeInvincibility = (i: ValidScoreboardIndex) => {
            this.arenaData.scoreboardColors[i] = Color.kMaxColors;
            this.arenaData.scoreboardNames[i] = "Invincibility";
            this.arenaData.scoreboardScores[i] = Math.round((this.invincibilityTimeLeft / tps > 60 ? this.invincibilityTimeLeft / 60 : this.invincibilityTimeLeft) / tps);
            this.arenaData.scoreboardTanks[i] = -1;
            this.arenaData.scoreboardSuffixes[i] = this.invincibilityTimeLeft / tps > 60 ? " min" : " sec";
        }

        const writeNexusHealth = (nexus: Nexus, i: ValidScoreboardIndex) => {
            this.arenaData.scoreboardColors[i] = nexus.styleData.color;
            this.arenaData.scoreboardNames[i] = `${(nexus.relationsData.team as TeamEntity).teamName} Nexus`;
            this.arenaData.scoreboardTanks[i] = -1;
            this.arenaData.scoreboardScores[i] = nexus.healthData.health;
            this.arenaData.scoreboardSuffixes[i] = " HP";
        }
        
        const writePlayerCount = (count: number, team: TeamEntity, i: ValidScoreboardIndex) => {
            this.arenaData.scoreboardColors[i] = team.teamData.teamColor;
            this.arenaData.scoreboardNames[i] = team.teamName;
            this.arenaData.scoreboardTanks[i] = -1;
            this.arenaData.scoreboardScores[i] = count;
            this.arenaData.scoreboardSuffixes[i] = " players";
        }

        const blueAlive = Entity.exists(this.blueNexus);
        const redAlive = Entity.exists(this.redNexus);

        if(!this.invincibilityTimeLeft && (!blueAlive || !redAlive)) {
            for(const client of this.game.clients) client.notify("From now on attacking a Nexus deals double the damage!", 0x0000FF, 10000, 'phase_transition');
            this.blueNexus.damageReduction = 2;
            this.blueNexus.shield.damageReduction = 2;
            this.redNexus.damageReduction = 2;
            this.redNexus.shield.damageReduction = 2;
        }

        if(this.arenaData.flags & ArenaFlags.showsLeaderArrow) this.arenaData.flags ^= ArenaFlags.showsLeaderArrow;

        let firstPlace = this.invincibilityTimeLeft ? 1 : 0 as ValidScoreboardIndex;
        let secondPlace = firstPlace + 1 as ValidScoreboardIndex;

        if(this.invincibilityTimeLeft) writeInvincibility(0);

        if(blueAlive && redAlive) {
            if(this.blueNexus.healthData.health > this.redNexus.healthData.health) {
                writeNexusHealth(this.blueNexus, firstPlace);
                writeNexusHealth(this.redNexus, secondPlace);
            } else {
                writeNexusHealth(this.redNexus, firstPlace);
                writeNexusHealth(this.blueNexus, secondPlace);
            }
        } else if(blueAlive && !redAlive) {
            let playerCount = 0;
            let leader: null | Client = null;
            for(const client of this.game.clients) {
                if(!client.camera || !(client.camera.cameraData.player instanceof TankBody) || !Entity.exists(client.camera.cameraData.player)) continue;
                if(client.camera.cameraData.player.relationsData.team !== this.redTeam) continue;
                if(!leader || (leader.camera as ClientCamera).cameraData.score < client.camera.cameraData.score) {
                    leader = client;
                    this.arenaData.leaderX = leader.camera?.cameraData.player?.positionData?.x || 0;
                    this.arenaData.leaderY = leader.camera?.cameraData.player?.positionData?.y || 0;
                    this.arenaData.flags |= ArenaFlags.showsLeaderArrow;
                }
                ++playerCount;
                client.camera.cameraData.score += 450 / client.camera.cameraData.level;
                client.camera.cameraData.player.styleData.opacity = 1;
            }
            if(!playerCount && this.state === ArenaState.OPEN) {
                this.close();
                for(const client of this.game.clients) client.notify("Team BLUE won the game!", ColorsHexCode[Color.TeamBlue], -1);
            }
            writeNexusHealth(this.blueNexus, firstPlace);
            writePlayerCount(playerCount, this.redTeam, secondPlace);
        } else if(!blueAlive && redAlive) {
            let playerCount = 0;
            let leader: null | Client = null;
            for(const client of this.game.clients) {
                if(!client.camera || !(client.camera.cameraData.player instanceof TankBody) || !Entity.exists(client.camera.cameraData.player)) continue;
                if(client.camera.cameraData.player.relationsData.team !== this.blueTeam) continue;
                if(!leader || (leader.camera as ClientCamera).cameraData.score < client.camera.cameraData.score) {
                    leader = client;
                    this.arenaData.leaderX = leader.camera?.cameraData.player?.positionData?.x || 0;
                    this.arenaData.leaderY = leader.camera?.cameraData.player?.positionData?.y || 0;
                    this.arenaData.flags |= ArenaFlags.showsLeaderArrow;
                }
                ++playerCount;
                client.camera.cameraData.score += 450 / client.camera.cameraData.level;
                client.camera.cameraData.player.styleData.opacity = 1;
            }
            if(!playerCount && this.state === ArenaState.OPEN) {
                this.close();
                for(const client of this.game.clients) client.notify("Team RED won the game!", ColorsHexCode[Color.TeamRed], -1);
            }
            writeNexusHealth(this.redNexus, firstPlace);
            writePlayerCount(playerCount, this.blueTeam, secondPlace);
        } else {
            let bluePlayers = 0, redPlayers = 0;
            let leader: null | Client = null;
            for(const client of this.game.clients) {
                if(!client.camera || !(client.camera.cameraData.player instanceof TankBody) || !Entity.exists(client.camera.cameraData.player)) continue;
                if(client.camera.cameraData.player.relationsData.team === this.redTeam) ++redPlayers;              
                else if(client.camera.cameraData.player.relationsData.team === this.blueTeam) ++bluePlayers;
                else continue;
                if(!leader || (leader.camera as ClientCamera).cameraData.score < client.camera.cameraData.score) {
                    leader = client;
                    this.arenaData.leaderX = leader.camera?.cameraData.player?.positionData?.x || 0;
                    this.arenaData.leaderY = leader.camera?.cameraData.player?.positionData?.y || 0;
                    this.arenaData.flags |= ArenaFlags.showsLeaderArrow;
                }
                client.camera.cameraData.score += 450 / client.camera.cameraData.level;
                client.camera.cameraData.player.styleData.opacity = 1;
            }
            if((!bluePlayers || !redPlayers) && this.state === ArenaState.OPEN) {
                this.close();
                if(!bluePlayers) {
                    for(const client of this.game.clients) client.notify("Team RED won the game!", ColorsHexCode[Color.TeamRed], -1);
                } else {
                    for(const client of this.game.clients) client.notify("Team BLUE won the game!", ColorsHexCode[Color.TeamBlue], -1);
                }
            }
            if(bluePlayers > redPlayers) {
                writePlayerCount(bluePlayers, this.blueTeam, firstPlace);
                writePlayerCount(redPlayers, this.redTeam, secondPlace);
            } else {
                writePlayerCount(redPlayers, this.redTeam, firstPlace);
                writePlayerCount(bluePlayers, this.blueTeam, secondPlace);
            }
        }

        this.arenaData.scoreboardAmount = this.invincibilityTimeLeft ? 3 : 2;
    }

    public tick(tick: number): void {
        this.shapes.tick();
        this.updateScoreboard();
        if(this.invincibilityTimeLeft) {
            --this.invincibilityTimeLeft;
            this.blueNexus.setInvicibility(true);
            this.redNexus.setInvicibility(true);
        } else {
            this.blueNexus.setInvicibility(false);
            this.redNexus.setInvicibility(false);
        }

        if(this.state === ArenaState.CLOSING) {
            let players = 0;
            for(const client of this.game.clients) {
                if(client.camera
                    && Entity.exists(client.camera.cameraData.player) 
                    && client.camera.cameraData.player instanceof TankBody
                    && client.camera.cameraData.player.physicsData.sides > 0
                ) ++players;
            }
            if(players) return;

			this.state = ArenaState.CLOSED;

			setTimeout(() => this.game.end(), 5000);
			return;
		}
    }
}