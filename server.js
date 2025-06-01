// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto'); // Built-in Node.js crypto module

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with settings optimized for Render.com
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000
});

// Admin credentials - should be stored in environment variables in production
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'vvrs2025whibo';

// Create admin namespace
const adminIo = io.of('/admin');

// Middleware for admin authentication
adminIo.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // In a production environment, you would validate the token properly
    // This is a simplified example
    if (token === 'demo-token-123') {
        next();
    } else {
        next(new Error("Unauthorized"));
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Basic route for the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Stats tracking
const stats = {
    totalUsers: 0,
    onlineUsers: 0,
    activeChats: 0,
    messagesToday: 0,
    chatLogs: [],
    userActivity: Array(24).fill(0) // Hourly activity for the last 24 hours
};

// Queue for users waiting to be matched
let waitingQueue = [];

// Active chat pairs (key: socket id, value: partner's socket id)
let chatPairs = new Map();

// User connections (key: socket id, value: user data)
let users = new Map();

// Generate a chat ID
function generateChatId() {
    return crypto.randomBytes(4).toString('hex');
}

// Regular socket connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Track user connection
    stats.totalUsers++;
    stats.onlineUsers++;
    
    // Record hourly activity
    const hour = new Date().getHours();
    stats.userActivity[hour]++;
    
    // Store user data
    users.set(socket.id, {
        id: socket.id,
        status: 'idle',
        connectedSince: Date.now(),
        partner: null,
        chatId: null,
        messagesSent: 0
    });
    
    // User wants to find a match
    socket.on('find match', () => {
        console.log(`${socket.id} is looking for a match. Current queue length: ${waitingQueue.length}`);
        
        // Update user status
        const userData = users.get(socket.id);
        if (userData) {
            userData.status = 'waiting';
            users.set(socket.id, userData);
        }
        
        // Remove from waiting queue if already in it (shouldn't happen, but just in case)
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        
        // Check if there's already someone in the queue
        if (waitingQueue.length > 0) {
            // Choose a random user from the queue for better matching experience
            const randomIndex = Math.floor(Math.random() * waitingQueue.length);
            const partnerId = waitingQueue[randomIndex];
            
            // Remove the chosen partner from the queue
            waitingQueue = waitingQueue.filter(id => id !== partnerId);
            
            const partnerSocket = io.sockets.sockets.get(partnerId);
            
            // Make sure partner is still connected
            if (partnerSocket) {
                console.log(`Matched: ${socket.id} and ${partnerId}`);
                
                try {
                    // Generate a unique chat ID
                    const chatId = generateChatId();
                    
                    // Establish the connection between the two users
                    chatPairs.set(socket.id, partnerId);
                    chatPairs.set(partnerId, socket.id);
                    
                    // Update user data
                    const userData = users.get(socket.id);
                    const partnerData = users.get(partnerId);
                    
                    if (userData) {
                        userData.status = 'chatting';
                        userData.partner = partnerId;
                        userData.chatId = chatId;
                        users.set(socket.id, userData);
                    }
                    
                    if (partnerData) {
                        partnerData.status = 'chatting';
                        partnerData.partner = socket.id;
                        partnerData.chatId = chatId;
                        users.set(partnerId, partnerData);
                    }
                    
                    // Increment active chats
                    stats.activeChats++;
                    
                    // Create new chat log
                    const chatLog = {
                        id: chatId,
                        user1: socket.id,
                        user2: partnerId,
                        startTime: Date.now(),
                        endTime: null,
                        duration: 0,
                        messageCount: 0,
                        status: 'active'
                    };
                    stats.chatLogs.push(chatLog);
                    
                    // Notify both users
                    socket.emit('matched');
                    partnerSocket.emit('matched');
                    
                    console.log(`Match notification sent to ${socket.id} and ${partnerId}`);
                    
                    // Update admin clients
                    emitAdminUpdates();
                } catch (error) {
                    console.error("Error in matching process:", error);
                    // Add user back to queue if there was an error
                    waitingQueue.push(socket.id);
                }
            } else {
                console.log(`Partner ${partnerId} is no longer connected. Adding ${socket.id} back to queue.`);
                // If partner disconnected while in queue, try again with next user
                waitingQueue.push(socket.id);
                // Remove the disconnected user from the queue
                waitingQueue = waitingQueue.filter(id => id !== partnerId);
                
                // Try to match immediately with another user
                if (waitingQueue.length > 1) {
                    socket.emit('find match');
                }
            }
        } else {
            // No one in the queue, add this user
            waitingQueue.push(socket.id);
            console.log(`${socket.id} added to waiting queue. Queue length now: ${waitingQueue.length}`);
        }
    });
    
    // User cancels search
    socket.on('cancel search', () => {
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        console.log(`${socket.id} cancelled search`);
        
        // Update user status
        const userData = users.get(socket.id);
        if (userData) {
            userData.status = 'idle';
            users.set(socket.id, userData);
            
            // Update admin clients
            emitAdminUpdates();
        }    });
    
    // User sends a message
    socket.on('chat message', (message, callback) => {
        const partnerId = chatPairs.get(socket.id);
        if (partnerId) {
            console.log(`Sending message from ${socket.id} to ${partnerId}`);
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket) {
                partnerSocket.emit('chat message', message);
                // Acknowledge message delivery
                if (typeof callback === 'function') {
                    callback(true);
                }
                
                // Update stats
                stats.messagesToday++;
                
                // Update user data
                const userData = users.get(socket.id);
                if (userData) {
                    userData.messagesSent++;
                    users.set(socket.id, userData);
                }
                
                // Update chat log
                const chatLog = stats.chatLogs.find(log => 
                    log.id === userData.chatId && log.status === 'active'
                );
                if (chatLog) {
                    chatLog.messageCount++;
                }
                
                // Update admin clients
                emitAdminUpdates();
            }
        }
    });
    
    // User is typing
    socket.on('typing', () => {
        const partnerId = chatPairs.get(socket.id);
        if (partnerId) {
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket) {
                partnerSocket.emit('typing');
            }
        }
    });
    
    // User stops typing
    socket.on('stop typing', () => {
        const partnerId = chatPairs.get(socket.id);
        if (partnerId) {
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket) {
                partnerSocket.emit('stop typing');
            }
        }
    });
    
    // User ends chat
    socket.on('end chat', () => {
        handleDisconnect(socket.id);
    });
    
    // User disconnects
    socket.on('disconnect', () => {
        handleDisconnect(socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
    
    // Handle nickname exchange
socket.on('request nickname', () => {
    const nickname = `User-${crypto.randomBytes(2).toString('hex')}`;
    socket.emit('stranger nickname', nickname);
});

socket.on('set nickname', (nickname) => {
    const partnerId = chatPairs.get(socket.id);
    if (partnerId) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
            partnerSocket.emit('stranger nickname', nickname);
        }
    }
});
    
    // Helper function to handle disconnection and end chat
    function handleDisconnect(userId) {
        // Remove from waiting queue
        waitingQueue = waitingQueue.filter(id => id !== userId);
        
        // Notify chat partner if in a chat
        const partnerId = chatPairs.get(userId);
        if (partnerId) {
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket) {
                partnerSocket.emit('stranger disconnected');
            }
            
            // Update partner data
            const partnerData = users.get(partnerId);
            if (partnerData) {
                partnerData.status = 'idle';
                partnerData.partner = null;
                users.set(partnerId, partnerData);
            }
            
            // Remove both pairings
            chatPairs.delete(partnerId);
            
            // Decrement active chats
            stats.activeChats = Math.max(0, stats.activeChats - 1);
            
            // Update chat log
            const userData = users.get(userId);
            if (userData && userData.chatId) {
                const chatLog = stats.chatLogs.find(log => 
                    log.id === userData.chatId && log.status === 'active'
                );
                
                if (chatLog) {
                    chatLog.endTime = Date.now();
                    chatLog.duration = Math.floor((chatLog.endTime - chatLog.startTime) / 1000);
                    chatLog.status = 'ended';
                }
            }
        }
        
        // Remove user data
        users.delete(userId);
        chatPairs.delete(userId);
        
        // Decrease online users
        stats.onlineUsers = Math.max(0, stats.onlineUsers - 1);
        
        // Update admin clients
        emitAdminUpdates();
    }
});

// Admin socket connections
adminIo.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.id}`);
    
    // Admin requests stats
    socket.on('get_stats', () => {
        socket.emit('stats_update', {
            totalUsers: stats.totalUsers,
            onlineUsers: stats.onlineUsers,
            activeChats: stats.activeChats,
            messagesToday: stats.messagesToday
        });
    });
    
    // Admin requests active users
    socket.on('get_active_users', () => {
        const activeUsers = Array.from(users.values());
        socket.emit('active_users_update', activeUsers);
    });
    
    // Admin requests chat logs
    socket.on('get_chat_logs', (filter) => {
        let filteredLogs = stats.chatLogs;
        
        if (filter && filter.date) {
            const filterDate = new Date(filter.date);
            filteredLogs = filteredLogs.filter(log => {
                const logDate = new Date(log.startTime);
                return logDate.toDateString() === filterDate.toDateString();
            });
        }
        
        socket.emit('chat_logs_update', filteredLogs);
    });
    
    // Admin disconnects a user
    socket.on('disconnect_user', (data) => {
        if (data && data.userId) {
            const userSocket = io.sockets.sockets.get(data.userId);
            if (userSocket) {
                userSocket.disconnect(true);
            }
            handleDisconnect(data.userId);
        }
    });
    
    // Clean up old chat logs (keep last 100)
    socket.on('cleanup_logs', () => {
        if (stats.chatLogs.length > 100) {
            stats.chatLogs = stats.chatLogs.slice(-100);
        }
        socket.emit('chat_logs_update', stats.chatLogs);
    });
});

// Helper function to emit updates to all admin clients
function emitAdminUpdates() {
    adminIo.emit('stats_update', {
        totalUsers: stats.totalUsers,
        onlineUsers: stats.onlineUsers,
        activeChats: stats.activeChats,
        messagesToday: stats.messagesToday
    });
    
    adminIo.emit('active_users_update', Array.from(users.values()));
}

// Reset daily stats at midnight
function resetDailyStats() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        stats.messagesToday = 0;
        console.log('Daily stats reset');
    }
}
setInterval(resetDailyStats, 60000); // Check every minute

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhiBO server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
});
