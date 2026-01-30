// ==========================================
// PLAYER WEBSOCKET SERVER
// ==========================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface PlayerState {
    screenId: number;
    currentVideo: string;
    currentTime: number;
    duration: number;
    paused: boolean;
    playlist: string[];
    currentIndex: number;
    loopMode: boolean;
    volume: number;
}

interface PlayerCommand {
    action: 'play' | 'pause' | 'seek' | 'playIndex' | 'setLoop' | 'setVolume' | 'next' | 'previous';
    screenId: number;
    value?: any;
}

// Store player states in memory
const playerStates = new Map<number, PlayerState>();

/**
 * Setup WebSocket server for player communication
 */
export function setupPlayerWebSocket(server: HTTPServer): SocketIOServer {
    const io = new SocketIOServer(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        allowEIO3: true,
        path: '/socket.io/'
    });

    console.log('🔌 WebSocket server initialized for player communication');

    io.on('connection', (socket: Socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        // Handle player joining a room (screen ID)
        socket.on('player:join', (screenId: number) => {
            socket.join(`screen-${screenId}`);
            console.log(`📺 Player joined screen ${screenId}`);

            // Send current state if exists
            const currentState = playerStates.get(screenId);
            if (currentState) {
                socket.emit('player:state', currentState);
            }
        });

        // Handle viewer joining a room
        socket.on('viewer:join', (screenId: number) => {
            socket.join(`screen-${screenId}`);
            console.log(`👁️ Viewer joined screen ${screenId}`);

            // Send current state if exists
            const currentState = playerStates.get(screenId);
            if (currentState) {
                socket.emit('player:state', currentState);
            }
        });

        // Handle player state updates from player
        socket.on('player:state', (state: PlayerState) => {
            const { screenId } = state;

            // Update stored state
            playerStates.set(screenId, state);

            // Broadcast to all viewers of this screen
            socket.to(`screen-${screenId}`).emit('player:state', state);

            console.log(`📊 Player state updated for screen ${screenId}: ${state.currentVideo} @ ${Math.floor(state.currentTime)}s`);
        });

        // Handle progress updates (throttled)
        socket.on('player:progress', (data: { screenId: number; currentTime: number; duration: number }) => {
            const { screenId, currentTime, duration } = data;

            // Update state
            const state = playerStates.get(screenId);
            if (state) {
                state.currentTime = currentTime;
                state.duration = duration;
                playerStates.set(screenId, state);
            }

            // Broadcast to viewers
            socket.to(`screen-${screenId}`).emit('player:progress', { currentTime, duration });
        });

        // Handle commands from viewer to player
        socket.on('player:command', (command: PlayerCommand) => {
            const { screenId, action, value } = command;

            console.log(`🎮 Command received for screen ${screenId}: ${action}`);

            // Broadcast command to player
            io.to(`screen-${screenId}`).emit('player:command', { action, value });

            // Update state based on command
            const state = playerStates.get(screenId);
            if (state) {
                switch (action) {
                    case 'play':
                        state.paused = false;
                        break;
                    case 'pause':
                        state.paused = true;
                        break;
                    case 'seek':
                        state.currentTime = value;
                        break;
                    case 'playIndex':
                        state.currentIndex = value;
                        state.currentVideo = state.playlist[value] || '';
                        break;
                    case 'setLoop':
                        state.loopMode = value;
                        break;
                    case 'setVolume':
                        state.volume = value;
                        break;
                }
                playerStates.set(screenId, state);
            }
        });

        // Handle video change
        socket.on('player:videoChange', (data: { screenId: number; currentVideo: string; currentIndex: number }) => {
            const { screenId, currentVideo, currentIndex } = data;

            const state = playerStates.get(screenId);
            if (state) {
                state.currentVideo = currentVideo;
                state.currentIndex = currentIndex;
                state.currentTime = 0;
                playerStates.set(screenId, state);
            }

            // Broadcast to viewers
            socket.to(`screen-${screenId}`).emit('player:videoChange', { currentVideo, currentIndex });
        });

        // Handle playlist initialization
        socket.on('player:init', (data: { screenId: number; playlist: string[]; loopMode: boolean }) => {
            const { screenId, playlist, loopMode } = data;

            const state: PlayerState = {
                screenId,
                currentVideo: playlist[0] || '',
                currentTime: 0,
                duration: 0,
                paused: false,
                playlist,
                currentIndex: 0,
                loopMode,
                volume: 1
            };

            playerStates.set(screenId, state);
            console.log(`🎬 Player initialized for screen ${screenId} with ${playlist.length} videos`);

            // Broadcast to viewers
            io.to(`screen-${screenId}`).emit('player:state', state);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

/**
 * Get current player state for a screen
 */
export function getPlayerState(screenId: number): PlayerState | undefined {
    return playerStates.get(screenId);
}

/**
 * Clear player state for a screen
 */
export function clearPlayerState(screenId: number): void {
    playerStates.delete(screenId);
    console.log(`🗑️ Player state cleared for screen ${screenId}`);
}
