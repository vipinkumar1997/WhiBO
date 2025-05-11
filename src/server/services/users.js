class UserService {
    constructor() {
        this.users = new Map();
        this.waitingQueue = [];
    }

    addUser(socketId, userData) {
        this.users.set(socketId, {
            id: socketId,
            status: 'idle',
            connectedSince: Date.now(),
            partner: null,
            chatId: null,
            messagesSent: 0,
            ...userData
        });
    }

    removeUser(socketId) {
        this.users.delete(socketId);
    }

    updateUserStatus(socketId, status, partnerId = null, chatId = null) {
        const userData = this.users.get(socketId);
        if (userData) {
            userData.status = status;
            userData.partner = partnerId;
            userData.chatId = chatId;
            this.users.set(socketId, userData);
        }
    }

    getUser(socketId) {
        return this.users.get(socketId);
    }

    getAllUsers() {
        return Array.from(this.users.values());
    }

    addToWaitingQueue(socketId) {
        if (!this.waitingQueue.includes(socketId)) {
            this.waitingQueue.push(socketId);
        }
    }

    removeFromWaitingQueue(socketId) {
        this.waitingQueue = this.waitingQueue.filter(id => id !== socketId);
    }

    getWaitingQueue() {
        return this.waitingQueue;
    }

    getQueuePosition(socketId) {
        return this.waitingQueue.indexOf(socketId);
    }

    getOnlineUsersCount() {
        return this.users.size;
    }
}

module.exports = new UserService();
