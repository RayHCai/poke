/**
 * Socket.IO server setup
 */
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabase } from '../db/supabase';

export function setupSockets(httpServer: HttpServer): SocketServer {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: '*', // TODO: Restrict in production
            methods: ['GET', 'POST'],
        },
        transports: ['websocket'],
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token as string;

            if (!token) {
                return next(new Error('Authentication token missing'));
            }

            const {
                data: { user },
                error,
            } = await supabase.auth.getUser(token);

            if (error || !user) {
                return next(new Error('Invalid authentication token'));
            }

            socket.data.userId = user.id;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId as string;
        console.info(`User connected: ${userId}`);

        // Join user's personal room
        socket.join(userId);

        socket.on('disconnect', () => {
            console.info(`User disconnected: ${userId}`);
        });
    });

    return io;
}

// Export socket instance (will be set in index.ts)
export let io: SocketServer;

export function setSocketInstance(instance: SocketServer): void {
    io = instance;
}
