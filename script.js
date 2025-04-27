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
    const themeSwitch = document.getElementById('theme-switch');
    const progressBar = document.querySelector('.search-progress-bar');
    
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
    
    // Ensure chat screen is hidden by default
    if (chatScreen) {
        chatScreen.style.display = 'none';
    }
    
    // Theme management
    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    }
    
    // Initialize theme from local storage
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (savedTheme === null && prefersDark)) {
            setTheme(true);
            if (themeSwitch) themeSwitch.checked = true;
        }
    }
    
    // Theme toggle event
    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            setTheme(themeSwitch.checked);
        });
    }
    
    // Initialize theme on load
    initTheme();
    
    // Functions to switch between screens
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        
        screen.classList.add('active');
        screen.style.display = 'flex';
        
        // Ensure full screen mode for chat screen
        if (screen === chatScreen) {
            // Make sure the chat screen takes full height and has no extra space
            chatScreen.style.height = '100%';
            chatScreen.style.padding = '0';
            chatScreen.style.margin = '0';
            
            // Reset scroll position
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
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
        
        // Add haptic feedback on mobile
        if (!isSelf && navigator.vibrate && window.innerWidth <= 768) {
            navigator.vibrate(50);
        }
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
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                appContainer.style.height = `calc(var(--vh, 1vh) * 100)`;
                appContainer.style.maxHeight = `calc(var(--vh, 1vh) * 100)`;
            }
        }
    }
    
    // Initialize iOS viewport fix
    fixIOSViewportHeight();
    
    // Update on resize
    window.addEventListener('resize', () => {
        fixIOSViewportHeight();
    });
    
    // Add reconnection handling for Render.com
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
        // Show reconnection message if in chat
        if (chatScreen && chatScreen.classList.contains('active')) {
            addSystemMessage('Connection lost. Attempting to reconnect...');
        }
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        if (chatScreen && chatScreen.classList.contains('active')) {
            addSystemMessage('Reconnected!');
        }
    });
    
    socket.on('reconnect_error', () => {
        console.log('Reconnection error');
        if (chatScreen && chatScreen.classList.contains('active')) {
            addSystemMessage('Failed to reconnect. Please refresh the page.');
        }
    });
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    // Show chat screen when user is connected
    socket.on('matched', () => {
        chatActive = true;

        // Display chat screen
        if (chatScreen) {
            chatScreen.style.display = 'flex';
        }
        showScreen(chatScreen);

        if (statusText) statusText.textContent = 'Connected with Stranger';

        // Update end chat button for mobile
        if (endChatBtn) {
            if (window.innerWidth <= 768) {
                endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-door-open"></i></span>';
            } else {
                endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-door-open"></i></span><span class="btn-text">End Chat</span>';
            }
        }

        // Clear previous messages if any
        if (chatMessages) chatMessages.innerHTML = '';
        addSystemMessage('You are now connected with a stranger');

        // Focus on input field
        setTimeout(() => {
            if (messageInput) messageInput.focus();
        }, 300);
    });
    
    socket.on('chat message', (message) => {
        addMessage(message, false);
        if (typingIndicator) typingIndicator.style.display = 'none';
    });
    
    socket.on('typing', () => {
        if (typingIndicator) typingIndicator.style.display = 'flex';
        
        // Scroll to show typing indicator
        smoothScrollToBottom();
    });
    
    socket.on('stop typing', () => {
        if (typingIndicator) typingIndicator.style.display = 'none';
    });
    
    socket.on('stranger disconnected', () => {
        if (chatActive) {
            addSystemMessage('Stranger has disconnected');
            if (statusText) statusText.textContent = 'Disconnected';
            
            const statusDot = document.querySelector('.status-dot');
            if (statusDot) statusDot.style.backgroundColor = 'var(--danger)';
            
            if (endChatBtn) {
                if (window.innerWidth <= 768) {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-redo"></i></span>';
                } else {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-redo"></i></span><span class="btn-text">New Chat</span>';
                }
            }
            
            chatActive = false;
        }
    });
    
    // Button click events
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            showScreen(waitingScreen);
            socket.emit('find match');
            
            // Add button click effect
            startChatBtn.classList.add('clicked');
            setTimeout(() => {
                startChatBtn.classList.remove('clicked');
            }, 200);
        });
    }
    
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            socket.emit('cancel search');
            if (waitingScreen) waitingScreen.style.display = 'none';
            showScreen(welcomeScreen);
        });
    }
    
    if (endChatBtn) {
        endChatBtn.addEventListener('click', () => {
            if (chatActive) {
                socket.emit('end chat');
                chatActive = false;
                if (statusText) statusText.textContent = 'Disconnected';
                
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) statusDot.style.backgroundColor = 'var(--danger)';
                
                if (window.innerWidth <= 768) {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-redo"></i></span>';
                } else {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-redo"></i></span><span class="btn-text">New Chat</span>';
                }
                
                addSystemMessage('You disconnected');
            } else {
                // Clear chat history
                if (chatMessages) chatMessages.innerHTML = '';
                
                if (window.innerWidth <= 768) {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-door-open"></i></span>';
                } else {
                    endChatBtn.innerHTML = '<span class="btn-icon"><i class="fas fa-door-open"></i></span><span class="btn-text">End Chat</span>';
                }
                
                if (statusText) statusText.textContent = 'Finding a new stranger...';
                
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) statusDot.style.backgroundColor = 'var(--success)';
                
                if (chatScreen) chatScreen.style.display = 'none';
                showScreen(waitingScreen);
                socket.emit('find match');
            }
        });
    }
    
    // New Topic button functionality
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (chatActive) {
                const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
                addSystemMessage(`Suggested topic: ${randomTopic}`);
                
                // Animate button
                newTopicBtn.classList.add('clicked');
                setTimeout(() => {
                    newTopicBtn.classList.remove('clicked');
                }, 200);
            }
        });
    }

    // Add event listeners for message input and send button
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }

    // Prevent textarea from capturing Enter key for form submission
    if (messageInput) {
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
    }

    // Send message function
    function sendMessage() {
        if (!messageInput) return;
        
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
            
            // Add send button animation
            sendMessageBtn.classList.add('clicked');
            setTimeout(() => {
                sendMessageBtn.classList.remove('clicked');
            }, 200);
        }
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

    // Add button animation class
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.add('btn-click');
            setTimeout(() => {
                this.classList.remove('btn-click');
            }, 300);
        });
    });
});
