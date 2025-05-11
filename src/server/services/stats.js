class StatsService {
    constructor() {
        this.stats = {
            totalUsers: 0,
            onlineUsers: 0,
            activeChats: 0,
            messagesToday: 0,
            chatLogs: [],
            userActivity: Array(24).fill(0)
        };
    }

    incrementTotalUsers() {
        this.stats.totalUsers++;
    }

    incrementOnlineUsers() {
        this.stats.onlineUsers++;
    }

    decrementOnlineUsers() {
        this.stats.onlineUsers = Math.max(0, this.stats.onlineUsers - 1);
    }

    incrementActiveChats() {
        this.stats.activeChats++;
    }

    decrementActiveChats() {
        this.stats.activeChats = Math.max(0, this.stats.activeChats - 1);
    }

    incrementMessagesToday() {
        this.stats.messagesToday++;
    }

    resetDailyStats() {
        this.stats.messagesToday = 0;
    }

    addChatLog(log) {
        this.stats.chatLogs.push(log);
    }

    updateChatLog(chatId, updates) {
        const chatLog = this.stats.chatLogs.find(log => log.id === chatId);
        if (chatLog) {
            Object.assign(chatLog, updates);
        }
    }

    getStats() {
        return this.stats;
    }

    getChatLogs(date = null) {
        if (!date) return this.stats.chatLogs;
        
        const filterDate = new Date(date);
        return this.stats.chatLogs.filter(log => {
            const logDate = new Date(log.startTime);
            return logDate.toDateString() === filterDate.toDateString();
        });
    }

    recordHourlyActivity() {
        const hour = new Date().getHours();
        this.stats.userActivity[hour]++;
    }

    cleanupOldLogs(maxLogs = 100) {
        if (this.stats.chatLogs.length > maxLogs) {
            this.stats.chatLogs = this.stats.chatLogs.slice(-maxLogs);
        }
    }
}

module.exports = new StatsService();
