document.addEventListener('DOMContentLoaded', () => {
    // Enhanced Socket.io connection with better error handling and debugging
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
    });
    
    // Socket connection event handlers with detailed logging
    socket.on('connect', () => {
        console.log('✅ Connected to chat server with ID:', socket.id);
        showToast('Connected to server!', 'success');
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        showToast('Could not connect to server. Please check your internet connection.', 'error');
    });
    
    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
        // If we were searching, reset the search UI
        if (isSearching) {
            isSearching = false;
            showScreen(welcomeScreen);
            showToast('Disconnected from server. Please try again.', 'error');
        }
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('✅ Reconnected to server after', attemptNumber, 'attempts');
        showToast('Reconnected to server!', 'success');
    });
    
    socket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect to server after multiple attempts');
        showToast('Could not reconnect to server. Please reload the page.', 'error');
    });
    
    // Add handler for queue position updates
    socket.on('queue_position', (data) => {
        console.log(`📊 Queue position update: ${data.position}`);
        updateQueueDisplay(data.position);
    });
    
    // Add handler for queue count updates
    socket.on('queue_update', (data) => {
        console.log(`📊 Queue size update: ${data.count} users waiting`);
        updateQueueDisplay(null, data.count);
    });
    
    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const chatScreen = document.getElementById('chat-screen');
    const startChatBtn = document.getElementById('start-chat');
    const cancelSearchBtn = document.getElementById('cancel-search');
    const endChatBtn = document.getElementById('end-chat');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const statusText = document.querySelector('.status-text');
    const newTopicBtn = document.getElementById('new-topic-btn');
    const themeSwitch = document.getElementById('theme-switch');
    const progressBar = document.querySelector('.search-progress-bar');
    
    // New UI Elements - Enhanced
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const chatSidebar = document.querySelector('.chat-sidebar');
    const emojiBtn = document.getElementById('emoji-btn');
    const toggleEmojiBtn = document.getElementById('toggle-emoji-btn');
    const emojiPicker = document.querySelector('.emoji-picker');
    const closeEmojiBtn = document.getElementById('close-emoji');
    const emojiCategories = document.querySelectorAll('.emoji-category');
    const emojiChars = document.querySelectorAll('.emoji-char');
    const attachBtn = document.getElementById('attach-btn');
    
    // Modern UI Elements
    const appContainer = document.querySelector('.app-container');
    const bgElements = document.querySelector('.bg-elements');

    // Chat topics for suggestions
    const chatTopics = [
        "What's your favorite hobby?",
        "If you could travel anywhere, where would you go?",
        "What's the best movie you've seen recently?",
        "Do you have any pets?",
        "What kind of music do you enjoy?",
        "What's your dream job?",
        "What's the most interesting fact you know?",
        "If you could have any superpower, what would it be?",
        "What's your favorite food?",
        "What are you passionate about?"
    ];
    
    // State variables
    let chatActive = false;
    let typingTimeout;
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let isAndroid = /Android/.test(navigator.userAgent);
    let isMobile = isIOS || isAndroid || window.innerWidth <= 768;
    let isKeyboardVisible = false;
    let lastMessageDate = null;
    let userNickname = localStorage.getItem('whibo-nickname') || generateRandomNickname();
    let userSettings = loadUserSettings();
    
    // New state variables
    let isSidebarVisible = window.innerWidth > 768; // Default visible on desktop
    let isEmojiPickerVisible = false;

    // New UI state variables
    let animationsEnabled = true;
    let particlesInitialized = false;
    let confettiActive = false;
    let isSearching = false;
    
    // User Dashboard Variables
    const userDashboard = document.getElementById('user-dashboard');
    const dashboardTabs = document.querySelectorAll('.nav-item');
    const dashboardTabContents = document.querySelectorAll('.dashboard-tab');
    const backToChatBtn = document.getElementById('back-to-chat');
    const editNicknameButton = document.getElementById('edit-nickname-btn');
    const editBioButton = document.getElementById('edit-bio-btn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const themeOptions = document.querySelectorAll('.theme-option');
    const bgOptions = document.querySelectorAll('.bg-option');
    const userNicknameElements = document.querySelectorAll('.user-nickname, .nickname-value');
    const settingsInputs = {
        notificationSound: document.getElementById('notification-sound'),
        autoScroll: document.getElementById('auto-scroll'),
        fontSize: document.getElementById('font-size'),
        blockImages: document.getElementById('block-images')
    };

    // User Dashboard Statistics
    let userStats = {
        totalChats: 0,
        messagesSent: 0,
        timeSpent: 0,
        peopleMet: 0
    };

    // User Profile Data
    let userProfile = {
        nickname: userNickname,
        bio: 'Tell others about yourself...',
        avatarStyle: 'user-circle',
        theme: 'default',
        background: 'default'
    };

    // Load user settings from localStorage
    function loadUserSettings() {
        const defaultSettings = {
            notificationSound: true,
            autoScroll: true,
            fontSize: 'medium'
        };
        
        try {
            const savedSettings = localStorage.getItem('whibo-settings');
            return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        } catch (e) {
            console.error('Error loading settings:', e);
            return defaultSettings;
        }
    }
    
    // Save user settings to localStorage
    function saveUserSettings() {
        try {
            localStorage.setItem('whibo-settings', JSON.stringify(userSettings));
            applyUserSettings();
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    // Apply settings to the UI
    function applyUserSettings() {
        // Apply font size
        document.documentElement.setAttribute('data-font-size', userSettings.fontSize);
    }
    
    // Generate a random nickname
    function generateRandomNickname() {
        const adjectives = ['Happy', 'Curious', 'Clever', 'Bright', 'Friendly', 'Gentle', 'Kind', 'Brave', 'Calm', 'Witty'];
        const nouns = ['Panda', 'Fox', 'Wolf', 'Eagle', 'Dolphin', 'Tiger', 'Lion', 'Hawk', 'Bear', 'Owl'];
        
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 100);
        
        return `${randomAdjective}${randomNoun}${randomNumber}`;
    }
    
    // Helper function to show a screen
    function showScreen(screen) {
        // Hide all screens
        welcomeScreen.classList.remove('active');
        waitingScreen.classList.remove('active');
        if (chatScreen) chatScreen.classList.remove('active');
        if (userDashboard) userDashboard.classList.remove('active');
        
        // Show the requested screen
        if (screen) {
            screen.classList.add('active');
            
            // Add entry animations based on screen type
            if (screen === welcomeScreen) {
                animateWelcomeScreen();
            } else if (screen === waitingScreen) {
                initParticles();
                startPulseAnimation();
                startProgressAnimation();
            } else if (screen === chatScreen) {
                // Ensure chat screen is fully initialized with flex display before showing
                chatScreen.style.display = 'flex';
                
                // Reset sidebar visibility based on screen size
                if (chatSidebar) {
                    isSidebarVisible = window.innerWidth > 768;
                    chatSidebar.style.transform = isSidebarVisible ? 'translateX(0)' : 'translateX(-100%)';
                    if (isSidebarVisible) {
                        chatSidebar.classList.add('visible');
                    } else {
                        chatSidebar.classList.remove('visible');
                    }
                }
                
                // Force a reflow to ensure the display change takes effect
                void chatScreen.offsetWidth;
                
                // Add animation class for smoother transition
                chatScreen.classList.add('animated-entry');
                setTimeout(() => {
                    chatScreen.classList.remove('animated-entry');
                }, 500);
                
                // Set focus to input after transition
                setTimeout(() => {
                    if (messageInput) messageInput.focus();
                }, 300);
            }
        }
    }

    // Start progress animation for the waiting screen
    function startProgressAnimation() {
        if (!progressBar) return;
        
        // Reset progress
        progressBar.style.width = '0%';
        
        // Animate to 90% over 10 seconds (will hold there until matched or cancelled)
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (!isSearching) {
                clearInterval(progressInterval);
                return;
            }
            
            if (progress < 90) {
                progress += 1;
                progressBar.style.width = progress + '%';
            }
        }, 100);
    }
    
    // Update the waiting screen with queue information
    function updateQueueDisplay(position, count) {
        const statusElement = document.querySelector('#waiting-screen .status-text');
        if (!statusElement) return;
        
        if (position) {
            statusElement.textContent = `You are #${position} in the queue`;
        } else if (count !== undefined) {
            // Only update if we're still on the waiting screen
            if (waitingScreen.classList.contains('active') && isSearching) {
                if (count === 0) {
                    statusElement.textContent = `Waiting for other users to join...`;
                } else {
                    statusElement.textContent = `${count} ${count === 1 ? 'person' : 'people'} waiting for a chat`;
                }
            }
        }
    }
    
    // Add a "debug mode" function that can be called from the browser console
    window.debugWhiBO = function() {
        console.log('💬 WhiBO Debug Info:');
        console.log('Socket connected:', socket.connected);
        console.log('Socket ID:', socket.id);
        console.log('Searching status:', isSearching);
        console.log('Chat active:', chatActive);
        
        // Try to reconnect if not connected
        if (!socket.connected) {
            console.log('Attempting to reconnect...');
            socket.connect();
        }
        
        return {
            connected: socket.connected,
            socketId: socket.id,
            searching: isSearching,
            chatActive: chatActive
        };
    };
    
    // Event listeners with enhanced connection checks
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            if (!socket.connected) {
                console.log('⚠️ Socket not connected, attempting to connect...');
                // Try to reconnect if not connected
                socket.connect();
                showToast('Connecting to server...', 'info');
                
                // Wait for connection before proceeding
                socket.once('connect', () => {
                    startChatSearch();
                });
                
                return;
            }
            
            startChatSearch();
        });
    }
    
    // Function to start chat search with error handling
    function startChatSearch() {
        // Update search status
        isSearching = true;
        
        // Show the waiting screen
        showScreen(waitingScreen);
        
        // Tell the server to find a match with error handling
        try {
            console.log('🔍 Finding match...');
            socket.emit('find match');
            
            // Show toast notification
            showToast('Looking for someone to chat with...', 'info');
            
            // Add visual feedback
            addRippleEffect(startChatBtn);
            
            // Add timeout for long searches
            setTimeout(() => {
                if (isSearching) {
                    console.log('⏱️ Search taking longer than expected...');
                    showToast('Still searching... Please wait a moment.', 'info');
                }
            }, 15000); // Show after 15 seconds of searching
        } catch (error) {
            console.error('❌ Error sending find match:', error);
            showToast('Error connecting to chat service. Please try again.', 'error');
            isSearching = false;
            showScreen(welcomeScreen);
        }
    }
    
    // Add ripple effect to buttons
    function addRippleEffect(button) {
        if (!button) return;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        button.appendChild(ripple);
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        
        // Start animation
        setTimeout(() => {
            ripple.style.transform = 'translate(-50%, -50%) scale(1)';
            ripple.style.opacity = '0';
        }, 10);
        
        // Clean up
        setTimeout(() => {
            ripple.remove();
        }, 500);
    }
    
    // Existing event listeners with better logging
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            console.log('🛑 Search cancelled by user');
            // Update search status
            isSearching = false;
            
            // Tell the server to cancel the search
            socket.emit('cancel search');
            
            // Return to welcome screen
            showScreen(welcomeScreen);
            
            // Add ripple effect
            addRippleEffect(cancelSearchBtn);
            
            // Show toast notification
            showToast('Search cancelled', 'info');
        });
    }

    // Socket events with enhanced logging
    socket.on('matched', () => {
        console.log('✅ Matched with stranger!');
        
        // Update search status
        isSearching = false;
        chatActive = true;
        
        // Show chat screen
        if (chatScreen) {
            // First ensure the display property is set before showing the screen
            chatScreen.style.display = 'flex';
            // Force a reflow to ensure the display change takes effect
            void chatScreen.offsetWidth;
            // Then activate the screen
            showScreen(chatScreen);
        }
        
        if (statusText) statusText.textContent = 'Connected with Stranger';
        
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) statusDot.style.backgroundColor = 'var(--success)';
        
        if (endChatBtn) {
            endChatBtn.innerHTML = '<i class="fas fa-door-open"></i><span>End Chat</span>';
        }
        
        if (chatMessages) chatMessages.innerHTML = '';
        lastMessageDate = null;
        addSystemMessage('You are now connected with a stranger');
        
        socket.emit('set nickname', userNickname);
        
        setTimeout(() => {
            if (messageInput) messageInput.focus();
            
            // Add celebration effect
            createConfetti();
            
            // Show welcome toast
            showToast('Connected! Start chatting now!', 'success');
        }, 300);
    });
    
    // Rest of your code remains unchanged
    // ...existing code...
});
