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
    const chatContainer = document.querySelector('.chat-container');

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

    // Initialize the application
    initializeApp();

    function initializeApp() {
        // Set initial UI state for chat sidebar
        if (chatSidebar && toggleSidebarBtn) {
            if (window.innerWidth <= 768) {
                chatSidebar.style.transform = 'translateX(-100%)';
                chatSidebar.classList.remove('visible');
            }
            
            // Toggle sidebar when button is clicked
            toggleSidebarBtn.addEventListener('click', () => {
                toggleSidebar();
            });
        }

        // Initialize emoji picker functionality
        initializeEmojiPicker();

        // Initialize animations
        initializeAnimations();

        // Apply user settings
        applyUserSettings();

        // Apply perspective effect to chat container
        if (chatContainer) {
            chatContainer.classList.add('perspective-container');
            
            // Add hover effect for 3D perspective
            chatContainer.addEventListener('mousemove', (e) => {
                if (!animationsEnabled || isMobile) return;
                
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                
                const rotateY = 5 * (x - 0.5);
                const rotateX = 5 * (0.5 - y);
                
                chatContainer.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });
            
            // Reset transform when mouse leaves
            chatContainer.addEventListener('mouseleave', () => {
                if (!animationsEnabled) return;
                chatContainer.style.transform = 'perspective(2000px) rotateX(0) rotateY(0) translateZ(0)';
            });
        }
        
        // Setup message input auto-resize
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                messageInput.style.height = 'auto';
                messageInput.style.height = (messageInput.scrollHeight < 120) ? messageInput.scrollHeight + 'px' : '120px';
            });
            
            // Monitor Enter key to send messages
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        // Initialize send button
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', sendMessage);
        }

        // Setup event listeners for chat topics suggestion
        if (newTopicBtn) {
            newTopicBtn.addEventListener('click', suggestChatTopic);
        }

        // Apply animations based on user preferences
        document.documentElement.setAttribute('data-animations', animationsEnabled ? 'enabled' : 'disabled');
    }

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
                  // Set focus to input and clear any previous messages
                setTimeout(() => {
                    if (messageInput) {
                        messageInput.focus();
                        if (chatMessages) {
                            chatMessages.innerHTML = '';
                            lastMessageDate = null;
                        }
                    }
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
    
    // Animate welcome screen elements
    function animateWelcomeScreen() {
        if (!animationsEnabled) return;
        
        // Animate heading elements with staggered timing
        const heading = document.querySelector('#welcome-screen h2');
        const description = document.querySelector('#welcome-screen p');
        const featureCards = document.querySelectorAll('#welcome-screen .grid > div');
        
        if (heading) {
            heading.style.opacity = '0';
            heading.style.transform = 'translateY(20px)';
            setTimeout(() => {
                heading.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                heading.style.opacity = '1';
                heading.style.transform = 'translateY(0)';
            }, 100);
        }
        
        if (description) {
            description.style.opacity = '0';
            description.style.transform = 'translateY(20px)';
            setTimeout(() => {
                description.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                description.style.opacity = '1';
                description.style.transform = 'translateY(0)';
            }, 300);
        }
        
        // Animate feature cards with staggered delay
        featureCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 500 + (index * 100));
        });
    }

    // Initialize emoji picker
    function initializeEmojiPicker() {
        // Toggle emoji picker visibility
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                toggleEmojiPicker();
            });
        }

        if (toggleEmojiBtn) {
            toggleEmojiBtn.addEventListener('click', () => {
                toggleEmojiPicker();
            });
        }

        // Close emoji picker
        if (closeEmojiBtn) {
            closeEmojiBtn.addEventListener('click', () => {
                closeEmojiPanel();
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (isEmojiPickerVisible &&
                !e.target.closest('.emoji-picker') && 
                !e.target.closest('#emoji-btn') &&
                !e.target.closest('#toggle-emoji-btn')) {
                closeEmojiPanel();
            }
        });

        // Handle emoji category selection
        emojiCategories.forEach(category => {
            category.addEventListener('click', () => {
                // Update active category
                emojiCategories.forEach(c => c.classList.remove('active'));
                category.classList.add('active');
                
                // TODO: Load emojis for the selected category
                // This would typically load emojis from a data source
            });
        });

        // Handle emoji selection
        emojiChars.forEach(emoji => {
            emoji.addEventListener('click', () => {
                insertEmoji(emoji.getAttribute('data-emoji'));
            });
        });
    }

    // Toggle emoji picker panel
    function toggleEmojiPicker() {
        if (isEmojiPickerVisible) {
            closeEmojiPanel();
        } else {
            openEmojiPanel();
        }
    }

    // Open emoji panel with animation
    function openEmojiPanel() {
        if (emojiPicker) {
            emojiPicker.classList.add('visible');
            isEmojiPickerVisible = true;
        }
    }

    // Close emoji panel with animation
    function closeEmojiPanel() {
        if (emojiPicker) {
            emojiPicker.classList.remove('visible');
            isEmojiPickerVisible = false;
        }
    }

    // Insert emoji into message input
    function insertEmoji(emoji) {
        if (!messageInput) return;
        
        // Get cursor position
        const startPos = messageInput.selectionStart;
        const endPos = messageInput.selectionEnd;
        
        // Insert emoji at cursor position
        const textBefore = messageInput.value.substring(0, startPos);
        const textAfter = messageInput.value.substring(endPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        
        // Reset cursor position after emoji
        messageInput.selectionStart = startPos + emoji.length;
        messageInput.selectionEnd = startPos + emoji.length;
        
        // Focus back on input
        messageInput.focus();
        
        // Trigger input event to resize textarea
        const inputEvent = new Event('input');
        messageInput.dispatchEvent(inputEvent);
    }

    // Toggle sidebar visibility
    function toggleSidebar() {
        if (!chatSidebar) return;
        
        isSidebarVisible = !isSidebarVisible;
        
        if (isSidebarVisible) {
            chatSidebar.style.transform = 'translateX(0)';
            chatSidebar.classList.add('visible');
        } else {
            chatSidebar.style.transform = 'translateX(-100%)';
            chatSidebar.classList.remove('visible');
        }
    }

    // Initialize animations and visual effects
    function initializeAnimations() {
        // Add background animated particles if supported
        if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
            animationsEnabled = true;
        } else {
            // Respect user's preference for reduced motion
            animationsEnabled = false;
        }
    }

    // Start particles animation for waiting screen
    function initParticles() {
        if (!animationsEnabled || particlesInitialized) return;
        
        // We can add particles animation for the waiting screen here
        // This would typically involve creating animated background elements
        
        particlesInitialized = true;
    }

    // Start pulse animation for waiting screen
    function startPulseAnimation() {
        const searchIcon = document.querySelector('#waiting-screen .fas.fa-search');
        if (!searchIcon || !animationsEnabled) return;
        
        searchIcon.classList.add('animate-pulse');
    }

    // Add system message to chat
    function addSystemMessage(message) {
        if (!chatMessages) return;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.textContent = message;
        
        // Add to chat
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        scrollChatToBottom();
    }    // Add a new message to the chat
    function addMessage(content, isOutgoing = false) {
        if (!chatMessages || !content) return;
        
        // Check if we need to add date separator
        addDateSeparatorIfNeeded();
        
        // Create message container
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOutgoing ? 'self' : 'stranger'}`;
        messageElement.setAttribute('data-time', formatTime(new Date()));
        
        // Create avatar element
        const avatarElement = document.createElement('div');
        avatarElement.className = 'message-avatar';
        
        const avatarIcon = document.createElement('i');
        avatarIcon.className = isOutgoing ? 'fas fa-user' : 'fas fa-user-secret';
        avatarElement.appendChild(avatarIcon);
        
        // Create message content wrapper
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Create message bubble with animation
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        messageBubble.textContent = content;
        messageBubble.style.animation = isOutgoing ? 'slideInRight 0.3s ease' : 'slideInLeft 0.3s ease';
          // Create nickname element
        const nicknameElement = document.createElement('div');
        nicknameElement.className = 'message-nickname';
        nicknameElement.textContent = isOutgoing ? userNickname : 'Stranger';
        
        // Assemble message components
        messageContent.appendChild(nicknameElement);
        messageContent.appendChild(messageBubble);
        
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(messageContent);
        
        // Add to chat with animation
        messageElement.style.opacity = '0';
        chatMessages.appendChild(messageElement);
        
        // Force a reflow to trigger animation
        void messageElement.offsetWidth;
        messageElement.style.opacity = '1';
        
        // Scroll to bottom
        scrollChatToBottom();
        
        // Provide haptic feedback on mobile devices
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        
        // Play sound for incoming messages
        if (!isOutgoing && userSettings.notificationSound) {
            playNotificationSound();
        }
    }

    // Add date separator if needed
    function addDateSeparatorIfNeeded() {
        const today = new Date();
        const todayDate = today.toDateString();
        
        if (lastMessageDate !== todayDate) {
            // Create date separator
            const dateElement = document.createElement('div');
            dateElement.className = 'date-separator';
            
            const dateText = document.createElement('div');
            dateText.className = 'date-separator-text';
            dateText.textContent = formatDate(today);
            
            dateElement.appendChild(dateText);
            chatMessages.appendChild(dateElement);
            
            // Update last message date
            lastMessageDate = todayDate;
        }
    }

    // Format time for message timestamp
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Format date for separator
    function formatDate(date) {
        // Check if date is today, yesterday, or other
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        }
    }

    // Scroll chat to bottom
    function scrollChatToBottom() {
        if (!chatMessages) return;
        
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    // Play notification sound
    function playNotificationSound() {
        // We can add sound notification here
        // This would typically play a short audio file for notifications
    }

    // Create confetti effect for successful match
    function createConfetti() {
        const colors = ['#818cf8', '#4f46e5', '#f472b6', '#ec4899', '#34d399', '#10b981'];
        const shapes = ['circle', 'square', 'triangle'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random position, color, shape
            const left = Math.random() * 100;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const delay = Math.random() * 3;
            const rotation = Math.random() * 360;
            const size = Math.random() * 10 + 5;
            
            confetti.style.left = `${left}%`;
            confetti.style.backgroundColor = color;
            confetti.style.width = `${size}px`;
            confetti.style.height = shape === 'circle' ? `${size}px` : shape === 'square' ? `${size}px` : `${size * 1.5}px`;
            confetti.style.borderRadius = shape === 'circle' ? '50%' : '0';
            
            if (shape === 'triangle') {
                confetti.style.backgroundColor = 'transparent';
                confetti.style.borderBottom = `${size * 1.5}px solid ${color}`;
                confetti.style.borderLeft = `${size / 2}px solid transparent`;
                confetti.style.borderRight = `${size / 2}px solid transparent`;
            }
            
            confetti.style.animationDelay = `${delay}s`;
            confetti.style.transform = `rotate(${rotation}deg)`;
            
            document.body.appendChild(confetti);
            
            // Remove confetti after animation completes
            setTimeout(() => {
                if (confetti && confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000 + (delay * 1000));
        }
    }

    // Display toast notification
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.alignItems = 'flex-end';
            toastContainer.style.gap = '10px';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '8px';
        toast.style.maxWidth = '300px';
        toast.style.fontWeight = '500';
        toast.style.fontSize = '14px';
        toast.style.animation = 'fadeIn 0.3s, slideInRight 0.3s';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        toast.style.opacity = '1';
        toast.style.transition = 'opacity 0.3s ease';

        // Set toast style based on type
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#10b981';
                toast.style.color = '#ffffff';
                toast.innerHTML = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                toast.style.backgroundColor = '#ef4444';
                toast.style.color = '#ffffff';
                toast.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                toast.style.backgroundColor = '#f59e0b';
                toast.style.color = '#ffffff';
                toast.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                toast.style.backgroundColor = '#6366f1';
                toast.style.color = '#ffffff';
                toast.innerHTML = '<i class="fas fa-info-circle"></i>';
        }

        // Add message
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        toast.appendChild(textSpan);

        // Add to container
        toastContainer.appendChild(toast);

        // Auto-remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }

    // Suggest a random chat topic
    function suggestChatTopic() {
        if (!chatActive || !messageInput) return;
        
        // Get random topic
        const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
        
        // Set input value
        messageInput.value = randomTopic;
        
        // Focus and trigger input event to resize textarea
        messageInput.focus();
        const inputEvent = new Event('input');
        messageInput.dispatchEvent(inputEvent);
        
        // Add visual feedback for topic suggestion
        addRippleEffect(newTopicBtn);
    }    // Send message function
    function sendMessage() {
        if (!messageInput || !chatActive) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add message to chat
        addMessage(message, true);
          // Emit message to server with correct event name and callback
        socket.emit('chat message', message, (delivered) => {
            if (delivered) {
                // Add a subtle checkmark to the message
                const lastMessage = chatMessages.lastElementChild;
                if (lastMessage) {
                    const check = document.createElement('span');
                    check.className = 'message-status';
                    check.innerHTML = '<i class="fas fa-check"></i>';
                    lastMessage.querySelector('.message-content').appendChild(check);
                }
            }
        });
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Update statistics
        userStats.messagesSent++;
        
        // Add ripple effect to button
        addRippleEffect(sendMessageBtn);
    }

    // Add ripple effect to buttons
    function addRippleEffect(button) {
        if (!button || !animationsEnabled) return;
        
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
    
    // Add makeChatFullScreen function to handle fullscreen mode
    function makeChatFullScreen(enable) {
        const chatContainer = document.querySelector('.chat-container');
        
        if (!chatContainer) return;
        
        if (enable) {
            chatContainer.classList.add('chat-fullscreen-mode');
            document.body.style.overflow = 'hidden'; // Prevent scrolling behind fullscreen
        } else {
            chatContainer.classList.remove('chat-fullscreen-mode');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    // Function to show matching animation
    function showMatchingAnimation() {
        return new Promise((resolve) => {
            const matchingContainer = document.querySelector('.matching-animation-container');
            
            if (!matchingContainer) {
                console.error('Matching animation container not found');
                resolve();
                return;
            }
            
            // Display the animation
            matchingContainer.classList.add('active');
            
            // Play the animation sequence
            setTimeout(() => {
                // After circles move towards each other, show connected message
                const connectedText = matchingContainer.querySelector('.connected-text');
                const connectedPulse = matchingContainer.querySelector('.connected-pulse');
                const circles = matchingContainer.querySelector('.matching-circles');
                const matchingText = matchingContainer.querySelector('.matching-text');
                
                if (circles && matchingText) {
                    circles.style.opacity = '0';
                    matchingText.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (connectedText) connectedText.classList.add('active');
                        if (connectedPulse) connectedPulse.classList.add('active');
                        
                        // Hide animation and resolve promise after the animation completes
                        setTimeout(() => {
                            matchingContainer.classList.remove('active');
                            
                            // Reset animation elements for next use
                            setTimeout(() => {
                                if (circles) circles.style.opacity = '1';
                                if (matchingText) matchingText.style.opacity = '1';
                                if (connectedText) connectedText.classList.remove('active');
                                if (connectedPulse) connectedPulse.classList.remove('active');
                                
                                resolve();
                            }, 300);
                        }, 1500);
                    }, 500);
                } else {
                    // If elements aren't found, resolve immediately
                    matchingContainer.classList.remove('active');
                    resolve();
                }
            }, 2000);
        });
    }

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
        
        // Show matching animation before displaying chat
        showMatchingAnimation().then(() => {
            // After animation completes, show the chat screen in fullscreen mode
            if (chatScreen) {
                chatScreen.style.display = 'flex';
                showScreen(chatScreen);
                
                // Make chat fullscreen after a slight delay
                setTimeout(() => {
                    makeChatFullScreen(true);
                }, 300);
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
            
            if (socket) socket.emit('set nickname', userNickname);
            
            setTimeout(() => {
                if (messageInput) messageInput.focus();
                
                // Add celebration effect
                createConfetti();
                
                // Show welcome toast
                showToast('Connected! Start chatting now!', 'success');
            }, 300);
        });
    });
      // Handle incoming messages with enhanced UI
    socket.on('chat message', (message) => {
        console.log('📩 Received message:', message);
        
        // Add message to chat UI
        addMessage(message, false);
        
        // Play notification sound if enabled
        if (userSettings.notificationSound) {
            playNotificationSound();
        }
    });
    
    // Handle typing indicator
    socket.on('typing', () => {
        if (!typingIndicator) return;
        
        // Show typing indicator
        typingIndicator.classList.add('visible');
        
        // Hide typing indicator after a delay
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            typingIndicator.classList.remove('visible');
        }, 3000);
    });
    
    // Handle chat ended
    socket.on('chat ended', (reason) => {
        console.log('🚫 Chat ended:', reason);
        
        chatActive = false;
        
        // Show system message
        addSystemMessage('Chat has ended. ' + (reason || 'Your partner has disconnected.'));
        
        // Change end chat button to new chat
        if (endChatBtn) {
            endChatBtn.innerHTML = '<i class="fas fa-sync"></i><span>New Chat</span>';
        }
        
        // Update status indicators
        if (statusText) statusText.textContent = 'Disconnected';
        
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) statusDot.style.backgroundColor = '#ef4444';
        
        // Show toast
        showToast('Chat ended. Click "New Chat" to start a new conversation.', 'info');
    });
    
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
});
