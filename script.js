document.addEventListener('DOMContentLoaded', () => {
    // Socket.io connection with optimized settings
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
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
    const emojiBtn = document.getElementById('emoji-btn');
    
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
    
    // Functions to switch between screens
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        screen.classList.add('active');
        screen.classList.remove('hidden');
        
        // Reset scroll position
        if (screen === chatScreen) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            window.scrollTo(0, 0);
        }
    }
    
    // Add a message to chat
    function addMessage(message, isSelf) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSelf ? 'self' : 'stranger');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        
        // Smooth scroll to bottom
        smoothScrollToBottom();
    }
    
    function smoothScrollToBottom() {
        const target = chatMessages.scrollHeight;
        const duration = 300;
        const startTime = performance.now();
        const startPos = chatMessages.scrollTop;
        const distance = target - startPos;
        
        function scrollAnimation(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime < duration) {
                chatMessages.scrollTop = easeInOutCubic(elapsedTime, startPos, distance, duration);
                requestAnimationFrame(scrollAnimation);
            } else {
                chatMessages.scrollTop = target;
            }
        }
        
        // Easing function for smooth scrolling
        function easeInOutCubic(t, b, c, d) {
            t /= d/2;
            if (t < 1) return c/2*t*t*t + b;
            t -= 2;
            return c/2*(t*t*t + 2) + b;
        }
        
        requestAnimationFrame(scrollAnimation);
    }
    
    // Add system message
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        
        // Smooth scroll to bottom
        smoothScrollToBottom();
    }
    
    // Fix for iOS viewport height issue
    function fixIOSViewportHeight() {
        if (isIOS) {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Apply the height to the container
            document.querySelector('.container').style.height = `calc(var(--vh, 1vh) * 100)`;
            document.querySelector('.container').style.maxHeight = `calc(var(--vh, 1vh) * 100)`;
        }
    }
    
    // Initialize iOS viewport fix
    fixIOSViewportHeight();
    
    // Update on resize
    window.addEventListener('resize', () => {
        fixIOSViewportHeight();
        
        // Reset textarea height
        messageInput.style.height = 'auto';
    });
    
    // Add reconnection handling for Render.com
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
        // Show reconnection message if in chat
        if (chatScreen.classList.contains('active')) {
            addSystemMessage('Connection lost. Attempting to reconnect...');
        }
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        if (chatScreen.classList.contains('active')) {
            addSystemMessage('Reconnected!');
        }
    });
    
    socket.on('reconnect_error', () => {
        console.log('Reconnection error');
        if (chatScreen.classList.contains('active')) {
            addSystemMessage('Failed to reconnect. Please refresh the page.');
        }
    });
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('matched', () => {
        chatActive = true;
        showScreen(chatScreen);
        statusText.textContent = 'Chatting with a stranger';
        
        // Update end chat button for mobile
        if (window.innerWidth <= 768) {
            endChatBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        } else {
            endChatBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span class="btn-text">End Chat</span>';
        }
        
        // Clear previous messages if any
        chatMessages.innerHTML = '';
        addSystemMessage('You are now connected with a stranger');
        
        // Focus on input field
        setTimeout(() => {
            messageInput.focus();
        }, 300);
    });
    
    socket.on('chat message', (message) => {
        addMessage(message, false);
        typingIndicator.style.display = 'none';
    });
    
    socket.on('typing', () => {
        typingIndicator.style.display = 'flex';
        
        // Scroll to show typing indicator
        smoothScrollToBottom();
    });
    
    socket.on('stop typing', () => {
        typingIndicator.style.display = 'none';
    });
    
    socket.on('stranger disconnected', () => {
        if (chatActive) {
            addSystemMessage('Stranger has disconnected');
            statusText.textContent = 'Disconnected';
            document.querySelector('.status-dot').style.backgroundColor = '#ff4d4d';
            
            if (window.innerWidth <= 768) {
                endChatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            } else {
                endChatBtn.innerHTML = '<i class="fas fa-redo"></i> <span class="btn-text">New Chat</span>';
            }
            
            chatActive = false;
        }
    });
    
    // Button click events
    startChatBtn.addEventListener('click', () => {
        console.log("Start chat button clicked, finding match...");
        showScreen(waitingScreen);
        socket.emit('find match');
        
        // Add progress bar animation
        const progressBar = document.querySelector('.search-progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 100) {
                    clearInterval(interval);
                } else {
                    width++;
                    progressBar.style.width = width + '%';
                }
            }, 100);
        }
    });
    
    cancelSearchBtn.addEventListener('click', () => {
        socket.emit('cancel search');
        showScreen(welcomeScreen);
    });
    
    endChatBtn.addEventListener('click', () => {
        if (chatActive) {
            socket.emit('end chat');
            chatActive = false;
            statusText.textContent = 'Disconnected';
            document.querySelector('.status-dot').style.backgroundColor = '#ff4d4d';
            
            if (window.innerWidth <= 768) {
                endChatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            } else {
                endChatBtn.innerHTML = '<i class="fas fa-redo"></i> <span class="btn-text">New Chat</span>';
            }
            
            addSystemMessage('You disconnected');
        } else {
            // Clear chat history
            chatMessages.innerHTML = '';
            
            if (window.innerWidth <= 768) {
                endChatBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            } else {
                endChatBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span class="btn-text">End Chat</span>';
            }
            
            statusText.textContent = 'Finding a new stranger...';
            document.querySelector('.status-dot').style.backgroundColor = '#4caf50';
            showScreen(waitingScreen);
            socket.emit('find match');
        }
    });
    
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Prevent textarea from capturing Enter key for form submission
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Emit typing event
        if (chatActive) {
            socket.emit('typing');
            
            // Clear previous timeout
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit('stop typing');
            }, 1000);
        }
    });
    
    // Auto-resize textarea as user types
    messageInput.addEventListener('input', function() {
        // Reset height to auto to correctly calculate new height
        this.style.height = 'auto';
        
        // Set the new height based on scroll height (max 100px)
        const newHeight = Math.min(this.scrollHeight, 100);
        this.style.height = newHeight + 'px';
    });
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && chatActive) {
            socket.emit('chat message', message);
            socket.emit('stop typing');
            addMessage(message, true);
            messageInput.value = '';
            
            // Reset textarea height
            messageInput.style.height = 'auto';
            
            // Focus back on input
            messageInput.focus();
        }
    }
    
    // New Topic button functionality
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (chatActive) {
                const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
                messageInput.value = randomTopic;
                messageInput.focus();
            }
        });
    }
    
    // Emoji button (placeholder functionality)
    if (emojiBtn) {
        emojiBtn.addEventListener('click', () => {
            // Simple emoji insertion for demo purposes
            const emojis = ['😊', '👋', '👍', '❤️', '😂', '🙌', '🎉', '🤔', '😎', '🔥'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            messageInput.value += randomEmoji;
            messageInput.focus();
        });
    }
    
    // Handle mobile keyboard adjustments
    if ('virtualKeyboard' in navigator) {
        navigator.virtualKeyboard.overlaysContent = true;
    }
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && chatActive) {
            // Notify server that user is active again if needed
        }
    });
    
    // Prevent zooming on double tap for touch devices
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd < 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});
