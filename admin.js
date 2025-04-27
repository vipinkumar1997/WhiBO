document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (localStorage.getItem('adminToken') && window.location.pathname === '/admin') {
        showDashboard();
    }
    
    // DOM elements for login
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error');
    
    // DOM elements for dashboard
    const sidebarItems = document.querySelectorAll('.sidebar-menu li');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const logoutBtn = document.getElementById('logout-btn');
    
    // DOM elements for forms
    const changePasswordForm = document.getElementById('change-password-form');
    const systemSettingsForm = document.getElementById('system-settings-form');
    
    // Admin credentials - secure password
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'vvrs2025whibo';
    
    // Socket connection for admin
    let socket;
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Simple authentication for demo
            // In production, this should be handled securely on the server
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                localStorage.setItem('adminToken', 'demo-token-123');
                showDashboard();
                initializeAdminSocket();
            } else {
                loginError.textContent = 'Invalid username or password';
            }
        });
    }
    
    // Handle sidebar navigation
    sidebarItems.forEach(item => {
        if (item.id !== 'logout-btn') {
            item.addEventListener('click', () => {
                // Update active tab
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Show corresponding content
                const tabId = item.getAttribute('data-tab');
                tabContents.forEach(tab => {
                    tab.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
                
                // Update page title
                pageTitle.textContent = `Dashboard ${item.textContent.trim()}`;
            });
        }
    });
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin';
        });
    }
    
    // Handle password change form
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const passwordError = document.getElementById('password-error');
            
            if (currentPassword !== ADMIN_PASSWORD) {
                passwordError.textContent = 'Current password is incorrect';
                return;
            }
            
            if (newPassword !== confirmPassword) {
                passwordError.textContent = 'New passwords do not match';
                return;
            }
            
            // Would send to server in production
            passwordError.textContent = 'Password changed successfully!';
            passwordError.style.color = 'green';
            
            // Reset form
            changePasswordForm.reset();
        });
    }
    
    // Handle system settings form
    if (systemSettingsForm) {
        systemSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const settings = {
                maxWaitingTime: document.getElementById('max-waiting-time').value,
                enableLogs: document.getElementById('enable-logs').checked,
                maintenanceMode: document.getElementById('maintenance-mode').checked
            };
            
            // Would send to server in production
            alert('Settings saved successfully!');
        });
    }
    
    // Function to switch to dashboard view
    function showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
    }
    
    // Initialize admin socket connection
    function initializeAdminSocket() {
        if (socket) return; // Don't initialize twice
        
        socket = io('/admin', {
            auth: {
                token: localStorage.getItem('adminToken')
            }
        });
        
        socket.on('connect', () => {
            console.log('Connected to admin socket');
            fetchDashboardData();
        });
        
        socket.on('stats_update', (data) => {
            updateDashboardStats(data);
        });
        
        socket.on('active_users_update', (data) => {
            updateActiveUsers(data);
        });
        
        socket.on('chat_logs_update', (data) => {
            updateChatLogs(data);
        });
        
        socket.on('unauthorized', () => {
            console.log('Unauthorized access attempt');
            localStorage.removeItem('adminToken');
            window.location.href = '/admin';
        });
        
        // Set up interval for regular updates
        setInterval(fetchDashboardData, 10000); // Update every 10 seconds
    }
    
    // Fetch initial dashboard data
    function fetchDashboardData() {
        if (!socket) return;
        
        socket.emit('get_stats');
        socket.emit('get_active_users');
        socket.emit('get_chat_logs', { date: new Date().toISOString().split('T')[0] });
    }
    
    // Update dashboard statistics
    function updateDashboardStats(data) {
        document.getElementById('total-users').textContent = data.totalUsers || 0;
        document.getElementById('online-users').textContent = data.onlineUsers || 0;
        document.getElementById('active-chats').textContent = data.activeChats || 0;
        document.getElementById('messages-today').textContent = data.messagesToday || 0;
    }
    
    // Update active users table
    function updateActiveUsers(users) {
        const tableBody = document.getElementById('active-users-table');
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = `
                <tr class="table-placeholder">
                    <td colspan="5">No active users at the moment</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        users.forEach(user => {
            tableBody.innerHTML += `
                <tr>
                    <td>${user.id.slice(0, 8)}...</td>
                    <td>
                        <span class="status-badge ${user.status === 'chatting' ? 'success' : 'waiting'}">
                            ${user.status}
                        </span>
                    </td>
                    <td>${formatTime(user.connectedSince)}</td>
                    <td>${user.partner ? user.partner.slice(0, 8) + '...' : 'None'}</td>
                    <td>
                        <button class="secondary-btn" onclick="disconnectUser('${user.id}')">
                            <i class="fas fa-times"></i> Disconnect
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    // Update chat logs table
    function updateChatLogs(logs) {
        const tableBody = document.getElementById('chat-logs-table');
        
        if (!logs || logs.length === 0) {
            tableBody.innerHTML = `
                <tr class="table-placeholder">
                    <td colspan="6">No chat logs for the selected date</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        logs.forEach(log => {
            tableBody.innerHTML += `
                <tr>
                    <td>${log.id.slice(0, 6)}</td>
                    <td>${log.user1.slice(0, 6)}...+${log.user2.slice(0, 6)}...</td>
                    <td>${formatDateTime(log.startTime)}</td>
                    <td>${formatDuration(log.duration)}</td>
                    <td>${log.messageCount}</td>
                    <td>
                        <span class="status-badge ${log.status === 'ended' ? 'danger' : 'success'}">
                            ${log.status}
                        </span>
                    </td>
                </tr>
            `;
        });
    }
    
    // Utility functions
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }
    
    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
    
    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    
    // Make disconnect function available globally
    window.disconnectUser = function(userId) {
        if (!socket) return;
        socket.emit('disconnect_user', { userId });
    };
});
