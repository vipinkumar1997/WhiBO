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
        
        // Show the requested screen
        if (screen) {
            screen.classList.add('active');
            
            // Add entry animations based on screen type
            if (screen === welcomeScreen) {
                animateWelcomeScreen();
            } else if (screen === waitingScreen) {
                initParticles();
                startPulseAnimation();
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
    
    // Format time for message bubbles
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Format date for separators
    function formatDate(date) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString(undefined, options);
        }
    }
    
    // Check if we need to add a date separator
    function checkDateSeparator(date) {
        const currentDate = new Date(date);
        
        if (!lastMessageDate || 
            currentDate.toDateString() !== lastMessageDate.toDateString()) {
            
            const separator = document.createElement('div');
            separator.className = 'date-separator';
            separator.innerHTML = `<span>${formatDate(currentDate)}</span>`;
            if (chatMessages) chatMessages.appendChild(separator);
            
            lastMessageDate = currentDate;
            return true;
        }
        
        lastMessageDate = currentDate;
        return false;
    }
    
    // Add a message to chat (Enhanced with modern animations)
    function addMessage(message, isSelf) {
        if (!chatMessages) return;
        
        const now = new Date();
        
        // Check if we need a date separator
        checkDateSeparator(now);
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSelf ? 'self' : 'stranger');
        
        // Add enhanced animation class based on message sender with modern effects
        const animationClass = isSelf ? 'message-in-right' : 'message-in-left';
        messageElement.classList.add(animationClass);
        messageElement.style.animationDuration = '0.4s';
        
        // Add formatted time as a data attribute
        const timeString = formatTime(now);
        messageElement.setAttribute('data-time', timeString);
        
        // Add message content wrapper with nickname and modern styling
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        // Add nickname with avatar for stranger messages
        const nicknameSpan = document.createElement('div');
        nicknameSpan.className = 'message-nickname';
        
        if (!isSelf) {
            // Add avatar for stranger's message
            const avatarElement = document.createElement('span');
            avatarElement.className = 'message-avatar';
            avatarElement.innerHTML = '<i class="fas fa-user-secret"></i>';
            nicknameSpan.appendChild(avatarElement);
        }
        
        const nameElement = document.createElement('span');
        nameElement.textContent = isSelf ? userNickname : 'Stranger';
        nicknameSpan.appendChild(nameElement);
        
        contentElement.appendChild(nicknameSpan);
        
        // Add message text with modern styling
        const messageTextSpan = document.createElement('div');
        messageTextSpan.className = 'message-text';
        
        // Process message for links, emojis, and formatting
        messageTextSpan.innerHTML = processMessageText(message);
        contentElement.appendChild(messageTextSpan);
        
        // Add translation button for stranger messages with modern icon
        if (!isSelf) {
            const translateButton = document.createElement('button');
            translateButton.className = 'translate-btn';
            translateButton.innerHTML = '<i class="fas fa-language"></i>';
            translateButton.title = 'Translate message';
            translateButton.addEventListener('click', () => translateMessage(messageElement));
            contentElement.appendChild(translateButton);
        }
        
        // Add reaction button for both message types
        const reactionButton = document.createElement('button');
        reactionButton.className = 'reaction-btn';
        reactionButton.innerHTML = '<i class="far fa-heart"></i>';
        reactionButton.title = 'React to message';
        reactionButton.addEventListener('click', (e) => showReactionMenu(e, messageElement));
        contentElement.appendChild(reactionButton);
        
        messageElement.appendChild(contentElement);
        chatMessages.appendChild(messageElement);
        
        // Apply 3D transform effect on hover
        messageElement.addEventListener('mouseenter', () => {
            if (animationsEnabled) {
                messageElement.style.transform = 'translateY(-3px) perspective(500px) rotateX(2deg)';
                messageElement.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
            }
        });
        
        messageElement.addEventListener('mouseleave', () => {
            if (animationsEnabled) {
                messageElement.style.transform = '';
                messageElement.style.boxShadow = '';
            }
        });
        
        // Play notification sound for incoming messages with enhanced audio
        if (!isSelf && userSettings.notificationSound) {
            playNotificationSound();
        }
        
        // Add haptic feedback on mobile with improved pattern
        if (!isSelf && navigator.vibrate && isMobile) {
            navigator.vibrate([50, 30, 20]); // More sophisticated vibration pattern
        }
        
        // Smooth scroll to bottom if auto-scroll is enabled
        if (userSettings.autoScroll) {
            smoothScrollToBottom();
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            messageElement.classList.remove('message-in-right', 'message-in-left');
        }, 500);
    }
    
    // Process message text to add links, emojis and formatting
    function processMessageText(text) {
        // Convert URLs to clickable links
        text = text.replace(/(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert emojis (basic implementation)
        text = text.replace(/:\)/g, '😊')
                   .replace(/:\(/g, '😢')
                   .replace(/:D/g, '😃')
                   .replace(/;\)/g, '😉')
                   .replace(/:P/g, '😛');
                   
        // Detect code blocks
        text = text.replace(/`(.*?)`/g, '<code>$1</code>');
        
        return text;
    }
    
    // Show reaction menu
    function showReactionMenu(event, messageElement) {
        event.stopPropagation();
        
        // Remove any existing reaction menus
        const existingMenu = document.querySelector('.reaction-menu');
        if (existingMenu) existingMenu.remove();
        
        // Create reaction menu
        const menu = document.createElement('div');
        menu.className = 'reaction-menu';
        
        // Common reactions
        const reactions = ['❤️', '👍', '👎', '😂', '😮', '😢', '🎉'];
        
        reactions.forEach(emoji => {
            const reactionBtn = document.createElement('button');
            reactionBtn.className = 'reaction-item';
            reactionBtn.textContent = emoji;
            reactionBtn.addEventListener('click', () => {
                addReaction(messageElement, emoji);
                menu.remove();
            });
            menu.appendChild(reactionBtn);
        });
        
        // Position the menu properly
        document.body.appendChild(menu);
        const rect = event.target.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        
        // Add animation
        menu.style.opacity = '0';
        menu.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => {
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0) scale(1)';
        }, 10);
        
        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }
    
    // Add reaction to message
    function addReaction(messageElement, emoji) {
        let reactionsContainer = messageElement.querySelector('.message-reactions');
        
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            messageElement.appendChild(reactionsContainer);
        }
        
        const reaction = document.createElement('span');
        reaction.className = 'reaction';
        reaction.textContent = emoji;
        reaction.style.opacity = '0';
        reaction.style.transform = 'scale(0)';
        reactionsContainer.appendChild(reaction);
        
        // Animate reaction appearance
        setTimeout(() => {
            reaction.style.opacity = '1';
            reaction.style.transform = 'scale(1)';
        }, 10);
    }
    
    // Add system message with modern styling
    function addSystemMessage(message) {
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        
        // Add icon for better visual hierarchy and modern styling
        messageElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span class="message-text">${message}</span>
        `;
        
        // Add entry animation
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(10px)';
        
        chatMessages.appendChild(messageElement);
        
        // Trigger animation after append
        setTimeout(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);
        
        // Smooth scroll to bottom
        smoothScrollToBottom();
    }
    
    // Show toast notification with modern styling
    function showToast(message, type = 'info', duration = 3000) {
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icon based on type
        let icon;
        switch (type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            default: icon = '<i class="fas fa-info-circle"></i>';
        }
        
        toast.innerHTML = `${icon}<span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Animate toast in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            
            setTimeout(() => {
                toast.remove();
                // If this was the last toast, remove the container
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, duration);
    }
    
    // Play notification sound with enhanced audio
    function playNotificationSound() {
        try {
            // Modern notification sound (still embedded for quick loading)
            const sound = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            sound.volume = 0.5;
            sound.play().catch(e => console.error('Error playing sound:', e));
            
            // Add audio visualization if in chat screen
            if (chatScreen && chatScreen.classList.contains('active')) {
                createAudioPulse();
            }
        } catch (e) {
            console.error('Error with notification sound:', e);
        }
    }
    
    // Create audio visualization pulse effect
    function createAudioPulse() {
        const pulse = document.createElement('div');
        pulse.className = 'audio-pulse';
        document.body.appendChild(pulse);
        
        // Position at the bottom-right corner
        pulse.style.bottom = '20px';
        pulse.style.right = '20px';
        
        // Remove after animation completes
        setTimeout(() => {
            pulse.remove();
        }, 1000);
    }
    
    // Initialize particle effects
    function initParticles() {
        if (particlesInitialized || !waitingScreen) return;
        
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        waitingScreen.appendChild(particlesContainer);
        
        // Create particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random properties
            const size = Math.random() * 10 + 2;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * 10;
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            // Add to container
            particlesContainer.appendChild(particle);
        }
        
        particlesInitialized = true;
    }
    
    // Start pulse animation for waiting screen
    function startPulseAnimation() {
        const radar = document.querySelector('.radar');
        if (!radar) return;
        
        radar.classList.add('active');
        
        // Add animated dot elements
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            dot.className = 'radar-dot';
            
            // Random position
            const angle = Math.random() * 360;
            const distance = Math.random() * 40 + 10;
            const delay = Math.random() * 5;
            
            // Calculate x and y
            const x = Math.cos(angle * Math.PI / 180) * distance;
            const y = Math.sin(angle * Math.PI / 180) * distance;
            
            dot.style.left = `calc(50% + ${x}px)`;
            dot.style.top = `calc(50% + ${y}px)`;
            dot.style.animationDelay = `${delay}s`;
            
            radar.appendChild(dot);
        }
    }
    
    // Create confetti effect for celebrations
    function createConfetti() {
        if (confettiActive) return;
        confettiActive = true;
        
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        // Create confetti pieces
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random properties
            const size = Math.random() * 10 + 5;
            const color = `hsl(${Math.random() * 360}, 100%, 70%)`;
            const posX = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = Math.random() * 3 + 2;
            
            // Set shape (square, circle, triangle)
            const shapes = ['square', 'circle', 'triangle'];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.classList.add(shape);
            
            // Apply styles
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.backgroundColor = color;
            confetti.style.left = `${posX}%`;
            confetti.style.top = '-20px';
            confetti.style.animationDuration = `${duration}s`;
            confetti.style.animationDelay = `${delay}s`;
            
            // Add to container
            confettiContainer.appendChild(confetti);
        }
        
        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
            confettiActive = false;
        }, 6000);
    }
    
    // Translate message (simulated) with improved UI
    function translateMessage(messageElement) {
        const messageText = messageElement.querySelector('.message-text').textContent;
        
        // Show modern loading indicator
        const translateBtn = messageElement.querySelector('.translate-btn');
        if (translateBtn) {
            translateBtn.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        // Simulate translation (in a real app, you would call a translation API)
        setTimeout(() => {
            // This is a simulation - in a real app you would call an actual translation API
            const translatedText = `[Translated] ${messageText}`;
            
            // Add translation to message with modern styling
            const messageTextElement = messageElement.querySelector('.message-text');
            messageTextElement.innerHTML = `
                <div class="original-message">${messageText}</div>
                <div class="translated-message">
                    <i class="fas fa-language translation-icon"></i>
                    ${translatedText}
                </div>
            `;
            
            // Reset button with success indicator
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    translateBtn.innerHTML = '<i class="fas fa-language"></i>';
                }, 2000);
            }
            
            // Show toast notification
            showToast('Message translated successfully!', 'success');
        }, 1000);
    }
    
    // Smooth scroll to bottom with improved animation
    function smoothScrollToBottom() {
        if (!chatMessages) return;
        
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        });
    }
    
    // Toggle chat sidebar visibility with enhanced animation
    function toggleSidebar() {
        if (!chatSidebar) return;
        
        isSidebarVisible = !isSidebarVisible;
        chatSidebar.style.transform = isSidebarVisible ? 'translateX(0)' : 'translateX(-100%)';
        
        // Add visible class for styling
        if (isSidebarVisible) {
            chatSidebar.classList.add('visible');
        } else {
            chatSidebar.classList.remove('visible');
        }
    }
    
    // Toggle emoji picker visibility with modern animation
    function toggleEmojiPicker() {
        if (!emojiPicker) return;
        
        isEmojiPickerVisible = !isEmojiPickerVisible;
        emojiPicker.style.display = isEmojiPickerVisible ? 'flex' : 'none';
        
        // If showing the picker, focus the input
        if (isEmojiPickerVisible && messageInput) {
            setTimeout(() => messageInput.focus(), 100);
        }
    }
    
    // Insert emoji into message input
    function insertEmoji(emoji) {
        if (!messageInput) return;
        
        const startPos = messageInput.selectionStart;
        const endPos = messageInput.selectionEnd;
        const textBefore = messageInput.value.substring(0, startPos);
        const textAfter = messageInput.value.substring(endPos);
        
        messageInput.value = textBefore + emoji + textAfter;
        
        // Set cursor position after the inserted emoji
        messageInput.selectionStart = startPos + emoji.length;
        messageInput.selectionEnd = startPos + emoji.length;
        
        // Focus back on the input
        messageInput.focus();
    }
    
    // Initialize additional emoji categories
    function initializeEmojiPicker() {
        const emojiGroups = {
            smileys: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊'],
            people: ['👋', '👍', '👎', '👏', '🙌', '🤝', '👌', '✌️', '🤟', '🤘'],
            animals: ['🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷'],
            food: ['🍎', '🍕', '🍔', '🌮', '🍦', '🍩', '🍰', '☕', '🍺', '🍓'],
            activities: ['⚽', '🏀', '🎮', '🎯', '🎨', '🎭', '🎤', '🎧', '🎬', '🎪'],
            travel: ['🚗', '✈️', '🚢', '🚂', '🚲', '🏖️', '🗻', '🏝️', '🏙️', '🏕️'],
            objects: ['💻', '📱', '🎁', '🔍', '⏰', '💡', '🔑', '📚', '🧸', '🎈'],
            symbols: ['❤️', '🧡', '💚', '💙', '💜', '🖤', '💔', '✨', '🌈', '🔥']
        };
        
        // Create emoji groups
        Object.keys(emojiGroups).forEach(category => {
            const existingGroup = document.querySelector(`.emoji-group[data-category="${category}"]`);
            if (existingGroup) {
                // Skip if group already exists
                return;
            }
            
            const group = document.createElement('div');
            group.className = 'emoji-group';
            group.setAttribute('data-category', category);
            group.style.display = 'none'; // Hide by default
            
            // Add emojis to the group
            emojiGroups[category].forEach(emoji => {
                const emojiElement = document.createElement('span');
                emojiElement.className = 'emoji-char';
                emojiElement.setAttribute('data-emoji', emoji);
                emojiElement.textContent = emoji;
                emojiElement.addEventListener('click', () => {
                    insertEmoji(emoji);
                });
                
                group.appendChild(emojiElement);
            });
            
            // Add group to the container
            const emojiContainer = document.querySelector('.emoji-container');
            if (emojiContainer) {
                emojiContainer.appendChild(group);
            }
        });
    }
    
    // Initialize nickname
    function setupNickname() {
        localStorage.setItem('whibo-nickname', userNickname);
        
        // Add nickname to welcome screen
        const welcomeContent = document.querySelector('.welcome-content');
        if (!welcomeContent) return;
        
        // Remove existing nickname section if any
        const existingNickname = welcomeContent.querySelector('.nickname-section');
        if (existingNickname) {
            existingNickname.remove();
        }
        
        const nicknameSection = document.createElement('div');
        nicknameSection.className = 'nickname-section';
        nicknameSection.innerHTML = `
            <div class="nickname-display">
                <span>Your nickname:</span>
                <span class="nickname-value">${userNickname}</span>
                <button class="edit-nickname-btn" title="Change nickname">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </div>
        `;
        
        // Insert before the start-section
        const startSection = welcomeContent.querySelector('.start-section');
        if (startSection) {
            welcomeContent.insertBefore(nicknameSection, startSection);
        } else {
            welcomeContent.appendChild(nicknameSection);
        }
        
        // Add event listener for nickname edit
        const editBtn = nicknameSection.querySelector('.edit-nickname-btn');
        if (editBtn) {
            editBtn.addEventListener('click', showNicknameDialog);
        }
        
        // Update user profile
        userProfile.nickname = userNickname;
        saveUserProfile();
        
        // Update dashboard if it exists
        updateProfileDisplay();
    }
    
    // Show dialog to change nickname with modern styling
    function showNicknameDialog() {
        // Create backdrop with blur effect
        const overlay = document.createElement('div');
        overlay.className = 'overlay backdrop-blur';
        
        // Create modern dialog with enhanced styling
        const dialog = document.createElement('div');
        dialog.className = 'dialog nickname-dialog glass-card';
        dialog.innerHTML = `
            <h3><i class="fas fa-user-edit"></i> Change Your Nickname</h3>
            <div class="input-group modern">
                <input type="text" id="nickname-input" value="${userNickname}" maxlength="20" autocomplete="off">
                <button id="generate-nickname" class="icon-button" title="Generate random nickname">
                    <i class="fas fa-dice"></i>
                </button>
            </div>
            <div class="dialog-actions">
                <button id="cancel-nickname" class="btn secondary-btn">Cancel</button>
                <button id="save-nickname" class="btn primary-btn pulse">Save</button>
            </div>
        `;
        
        // Add entry animation
        dialog.style.transform = 'translateY(20px) scale(0.95)';
        dialog.style.opacity = '0';
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Animate entry
        setTimeout(() => {
            dialog.style.transform = 'translateY(0) scale(1)';
            dialog.style.opacity = '1';
        }, 10);
        
        // Focus on input
        const nicknameInput = document.getElementById('nickname-input');
        if (nicknameInput) {
            setTimeout(() => {
                nicknameInput.focus();
                nicknameInput.select();
            }, 100);
        }
        
        // Generate random nickname with animation
        document.getElementById('generate-nickname').addEventListener('click', () => {
            const newRandomNickname = generateRandomNickname();
            const input = document.getElementById('nickname-input');
            
            // Add typing animation effect
            animateTyping(input, newRandomNickname);
        });
        
        // Cancel button with animation
        document.getElementById('cancel-nickname').addEventListener('click', () => {
            // Exit animation
            dialog.style.transform = 'translateY(20px) scale(0.95)';
            dialog.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
            }, 200);
        });
        
        // Save button
        document.getElementById('save-nickname').addEventListener('click', () => {
            saveNickname();
        });

        // Handle Enter key press
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveNickname();
            }
        });
        
        function saveNickname() {
            const newNickname = document.getElementById('nickname-input').value.trim();
            if (newNickname) {
                const oldNickname = userNickname;
                userNickname = newNickname;
                localStorage.setItem('whibo-nickname', userNickname);
                
                // Update displayed nickname
                const nicknameValue = document.querySelector('.nickname-value');
                if (nicknameValue) {
                    nicknameValue.textContent = userNickname;
                }
                
                // Exit animation
                dialog.style.transform = 'translateY(20px) scale(0.95)';
                dialog.style.opacity = '0';
                
                setTimeout(() => {
                    overlay.remove();
                    
                    // Show success toast
                    showToast(`Nickname changed to "${userNickname}"`, 'success');
                    
                    // If in chat, update system message
                    if (chatActive) {
                        addSystemMessage(`You changed your nickname from ${oldNickname} to ${userNickname}`);
                        socket.emit('set nickname', userNickname);
                    }
                }, 200);
            }
        }
    }
    
    // Animate typing effect for input
    function animateTyping(inputElement, finalText) {
        const originalText = inputElement.value;
        inputElement.value = '';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < finalText.length) {
                inputElement.value += finalText.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
            }
        }, 30);
    }
    
    // Animate welcome screen elements
    function animateWelcomeScreen() {
        const heroElements = document.querySelectorAll('.hero > *');
        const features = document.querySelectorAll('.feature');
        const startSection = document.querySelector('.start-section');
        
        // Reset animations
        heroElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
        });
        
        features.forEach(feature => {
            feature.style.opacity = '0';
            feature.style.transform = 'translateY(20px)';
        });
        
        if (startSection) {
            startSection.style.opacity = '0';
            startSection.style.transform = 'translateY(20px)';
        }
        
        // Animate elements sequentially
        setTimeout(() => {
            heroElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 200);
            });
            
            // Animate features with delay
            setTimeout(() => {
                features.forEach((feature, index) => {
                    setTimeout(() => {
                        feature.style.opacity = '1';
                        feature.style.transform = 'translateY(0)';
                    }, index * 150);
                });
                
                // Animate start section
                setTimeout(() => {
                    if (startSection) {
                        startSection.style.opacity = '1';
                        startSection.style.transform = 'translateY(0)';
                    }
                }, features.length * 150 + 100);
                
            }, heroElements.length * 200 + 100);
        }, 100);
    }
    
    // Initialize modern UI components
    function initializeUI() {
        // Set up theme
        initTheme();
        
        // Initialize nickname
        setupNickname();
        
        // Initialize emoji picker
        initializeEmojiPicker();
        
        // Apply user settings
        applyUserSettings();
        
        // Initialize search progress animation with modern styling
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.add('modern-progress');
            
            // Add animation
            let progress = 0;
            let direction = 1;
            
            function animateProgress() {
                if (direction > 0) {
                    progress += 0.5;
                    if (progress >= 95) {
                        direction = -1;
                    }
                } else {
                    progress -= 0.5;
                    if (progress <= 30) {
                        direction = 1;
                    }
                }
                
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                    
                    // Update gradient position for flowing effect
                    const gradientPos = (progress % 100);
                    progressBar.style.backgroundPosition = `${gradientPos}% 0%`;
                }
            }
            
            // Set up continuous animation while in waiting screen
            const progressInterval = setInterval(() => {
                if (waitingScreen.classList.contains('active')) {
                    animateProgress();
                }
            }, 30);
            
            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                clearInterval(progressInterval);
            });
        }
        
        // Make sure chat screen is initially hidden
        if (chatScreen) {
            chatScreen.style.display = 'none';
        }
        
        // Add modern animated background
        initializeAnimatedBackground();
        
        // Add initial welcome screen animations
        if (welcomeScreen.classList.contains('active')) {
            animateWelcomeScreen();
        }
    }
    
    // Initialize modern animated background
    function initializeAnimatedBackground() {
        if (!bgElements) return;
        
        // Add geometric shapes for modern design
        const shapes = [
            { class: 'bg-shape shape-1', top: '20%', left: '10%' },
            { class: 'bg-shape shape-2', bottom: '15%', right: '20%' }
        ];
        
        shapes.forEach(shape => {
            const element = document.createElement('div');
            element.className = shape.class;
            
            if (shape.top) element.style.top = shape.top;
            if (shape.bottom) element.style.bottom = shape.bottom;
            if (shape.left) element.style.left = shape.left;
            if (shape.right) element.style.right = shape.right;
            
            bgElements.appendChild(element);
        });
    }
    
    // Initialize dashboard
    function initializeDashboard() {
        // Update user profile elements
        updateProfileDisplay();
        
        // Set up dashboard navigation
        dashboardTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                dashboardTabs.forEach(t => t.classList.remove('active'));
                dashboardTabContents.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding tab content
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });
        
        // Back to chat button
        if (backToChatBtn) {
            backToChatBtn.addEventListener('click', () => {
                hideUserDashboard();
            });
        }
        
        // Edit nickname button
        if (editNicknameButton) {
            editNicknameButton.addEventListener('click', () => {
                showNicknameDialog();
            });
        }
        
        // Edit bio button
        if (editBioButton) {
            editBioButton.addEventListener('click', () => {
                showBioDialog();
            });
        }
        
        // Avatar selection
        avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                avatarOptions.forEach(o => o.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update user avatar style
                const avatarIcon = option.querySelector('i').className.replace('fas ', '');
                userProfile.avatarStyle = avatarIcon;
                
                // Update avatar display
                updateAvatarDisplay();
                
                // Save to localStorage
                saveUserProfile();
            });
        });
        
        // Theme selection
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                themeOptions.forEach(o => o.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update user theme
                const themeName = option.getAttribute('data-theme');
                userProfile.theme = themeName;
                
                // Apply theme
                applyTheme(themeName);
                
                // Save to localStorage
                saveUserProfile();
            });
        });
        
        // Background selection
        bgOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                bgOptions.forEach(o => o.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update user background
                const bgName = option.getAttribute('data-bg');
                userProfile.background = bgName;
                
                // Apply background
                applyBackground(bgName);
                
                // Save to localStorage
                saveUserProfile();
            });
        });
        
        // Settings changes
        if (settingsInputs.notificationSound) {
            settingsInputs.notificationSound.addEventListener('change', () => {
                userSettings.notificationSound = settingsInputs.notificationSound.checked;
                saveUserSettings();
            });
        }
        
        if (settingsInputs.autoScroll) {
            settingsInputs.autoScroll.addEventListener('change', () => {
                userSettings.autoScroll = settingsInputs.autoScroll.checked;
                saveUserSettings();
            });
        }
        
        if (settingsInputs.fontSize) {
            settingsInputs.fontSize.addEventListener('change', () => {
                userSettings.fontSize = settingsInputs.fontSize.value;
                saveUserSettings();
                applyUserSettings();
            });
        }
        
        // Load stats
        updateDashboardStats();
    }

    // Show user dashboard
    function showUserDashboard() {
        // Hide current screen
        document.querySelectorAll('.screen.active').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show dashboard
        userDashboard.classList.add('active');
        
        // Load latest data
        loadUserProfile();
        updateProfileDisplay();
        
        // Update dashboard stats
        updateDashboardStats();
    }

    // Hide user dashboard
    function hideUserDashboard() {
        userDashboard.classList.remove('active');
        
        // Show chat screen or welcome screen based on chat status
        if (chatActive) {
            showScreen(chatScreen);
        } else {
            showScreen(welcomeScreen);
        }
    }

    // Update user profile display
    function updateProfileDisplay() {
        // Update nickname display
        userNicknameElements.forEach(element => {
            if (element) element.textContent = userProfile.nickname;
        });
        
        // Update bio display
        const bioElement = document.querySelector('.bio-value');
        if (bioElement) bioElement.textContent = userProfile.bio;
        
        // Update avatar
        updateAvatarDisplay();
        
        // Update settings inputs
        if (settingsInputs.notificationSound) {
            settingsInputs.notificationSound.checked = userSettings.notificationSound;
        }
        
        if (settingsInputs.autoScroll) {
            settingsInputs.autoScroll.checked = userSettings.autoScroll;
        }
        
        if (settingsInputs.fontSize) {
            settingsInputs.fontSize.value = userSettings.fontSize;
        }
        
        if (settingsInputs.blockImages) {
            settingsInputs.blockImages.checked = userSettings.blockImages || false;
        }
        
        // Select the correct theme option
        const activeTheme = document.querySelector(`.theme-option[data-theme="${userProfile.theme}"]`);
        if (activeTheme) {
            themeOptions.forEach(o => o.classList.remove('selected'));
            activeTheme.classList.add('selected');
        }
        
        // Select the correct background option
        const activeBg = document.querySelector(`.bg-option[data-bg="${userProfile.background}"]`);
        if (activeBg) {
            bgOptions.forEach(o => o.classList.remove('selected'));
            activeBg.classList.add('selected');
        }
    }

    // Update avatar display
    function updateAvatarDisplay() {
        // Find the avatar option with the selected style
        const selectedAvatar = document.querySelector(`.avatar-option i.fa-${userProfile.avatarStyle}`);
        if (selectedAvatar) {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            selectedAvatar.parentElement.classList.add('selected');
        }
        
        // Update avatar in header
        const userAvatarElement = document.querySelector('.user-avatar i');
        if (userAvatarElement) {
            userAvatarElement.className = `fas fa-${userProfile.avatarStyle}`;
        }
    }

    // Show bio edit dialog
    function showBioDialog() {
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'dialog nickname-dialog';
        dialog.innerHTML = `
            <h3><i class="fas fa-edit"></i> Edit Bio</h3>
            <div class="input-group modern">
                <textarea id="bio-input" rows="4" placeholder="Tell others about yourself...">${userProfile.bio}</textarea>
            </div>
            <div class="dialog-actions">
                <button class="btn secondary-btn" id="cancel-bio">Cancel</button>
                <button class="btn primary-btn" id="save-bio">Save</button>
            </div>
        `;
        
        // Add dialog to document
        document.body.appendChild(dialog);
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'backdrop';
        document.body.appendChild(backdrop);
        
        // Focus input
        const bioInput = document.getElementById('bio-input');
        setTimeout(() => {
            bioInput.focus();
        }, 100);
        
        // Add event listeners
        const cancelButton = document.getElementById('cancel-bio');
        const saveButton = document.getElementById('save-bio');
        
        cancelButton.addEventListener('click', () => {
            closeDialog();
        });
        
        saveButton.addEventListener('click', () => {
            const newBio = bioInput.value.trim();
            if (newBio) {
                userProfile.bio = newBio;
                saveUserProfile();
                updateProfileDisplay();
            }
            closeDialog();
        });
        
        // Close dialog function
        function closeDialog() {
            document.body.removeChild(dialog);
            document.body.removeChild(backdrop);
        }
        
        // Position dialog
        dialog.style.opacity = '0';
        dialog.style.transform = 'scale(0.8)';
        
        requestAnimationFrame(() => {
            dialog.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        });
    }

    // Apply theme
    function applyTheme(theme) {
        // Remove existing theme classes
        document.documentElement.classList.remove('theme-midnight', 'theme-sunset', 'theme-forest', 'theme-ocean');
        
        // Add new theme class
        if (theme !== 'default') {
            document.documentElement.classList.add(`theme-${theme}`);
        }
    }

    // Apply background
    function applyBackground(bg) {
        // Get chat background element
        const chatBackground = document.querySelector('.chat-background');
        if (!chatBackground) return;
        
        // Remove existing background classes
        chatBackground.classList.remove('bg-default', 'bg-gradient', 'bg-dots', 'bg-waves');
        
        // Add new background class
        chatBackground.classList.add(`bg-${bg}`);
    }

    // Load user profile from localStorage
    function loadUserProfile() {
        const defaultProfile = {
            nickname: userNickname,
            bio: 'Tell others about yourself...',
            avatarStyle: 'user-circle',
            theme: 'default',
            background: 'default'
        };
        
        try {
            const savedProfile = localStorage.getItem('whibo-profile');
            if (savedProfile) {
                const parsedProfile = JSON.parse(savedProfile);
                userProfile = { ...defaultProfile, ...parsedProfile };
                
                // Make sure nickname is in sync
                userProfile.nickname = userNickname;
            } else {
                userProfile = defaultProfile;
            }
        } catch (e) {
            console.error('Error loading user profile:', e);
            userProfile = defaultProfile;
        }
    }

    // Save user profile to localStorage
    function saveUserProfile() {
        try {
            localStorage.setItem('whibo-profile', JSON.stringify(userProfile));
        } catch (e) {
            console.error('Error saving user profile:', e);
        }
    }

    // Update dashboard stats
    function updateDashboardStats() {
        // Load stats from localStorage
        loadUserStats();
        
        // Update stats display
        document.getElementById('total-chats').textContent = userStats.totalChats;
        document.getElementById('messages-sent').textContent = userStats.messagesSent;
        document.getElementById('time-spent').textContent = formatTime(userStats.timeSpent);
        document.getElementById('people-met').textContent = userStats.peopleMet;
    }

    // Load user stats from localStorage
    function loadUserStats() {
        const defaultStats = {
            totalChats: 0,
            messagesSent: 0,
            timeSpent: 0,
            peopleMet: 0
        };
        
        try {
            const savedStats = localStorage.getItem('whibo-stats');
            if (savedStats) {
                userStats = { ...defaultStats, ...JSON.parse(savedStats) };
            } else {
                userStats = defaultStats;
            }
        } catch (e) {
            console.error('Error loading user stats:', e);
            userStats = defaultStats;
        }
    }

    // Save user stats to localStorage
    function saveUserStats() {
        try {
            localStorage.setItem('whibo-stats', JSON.stringify(userStats));
        } catch (e) {
            console.error('Error saving user stats:', e);
        }
    }

    // Format time in minutes to readable format
    function formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        }
    }

    // Add dashboard button to sidebar
    function addDashboardButton() {
        const sidebarActions = document.querySelector('.sidebar-actions');
        if (!sidebarActions) return;
        
        // Create dashboard button if it doesn't exist
        if (!document.getElementById('dashboard-btn')) {
            const dashboardBtn = document.createElement('button');
            dashboardBtn.id = 'dashboard-btn';
            dashboardBtn.className = 'sidebar-btn';
            dashboardBtn.title = 'User Dashboard';
            dashboardBtn.innerHTML = `
                <i class="fas fa-user-cog"></i>
                <span>Dashboard</span>
            `;
            
            // Insert before end chat button
            const endChatBtn = document.getElementById('end-chat');
            if (endChatBtn) {
                sidebarActions.insertBefore(dashboardBtn, endChatBtn);
            } else {
                sidebarActions.appendChild(dashboardBtn);
            }
            
            // Add click event
            dashboardBtn.addEventListener('click', () => {
                showUserDashboard();
                addRippleEffect(dashboardBtn);
            });
        }
    }

    // Update user statistics after a chat
    function updateChatStats(duration, messagesSent) {
        userStats.totalChats++;
        userStats.messagesSent += messagesSent;
        userStats.timeSpent += Math.round(duration / 60); // Convert seconds to minutes
        userStats.peopleMet++;
        
        saveUserStats();
    }

    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
        showToast('Connected to server!', 'success');
    });
    
    socket.on('matched', () => {
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
    
    // Remaining socket events with enhanced feedback
    socket.on('chat message', (message) => {
        addMessage(message, false);
        if (typingIndicator) typingIndicator.style.display = 'none';
    });
    
    socket.on('typing', () => {
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            // Add subtle bounce animation
            typingIndicator.classList.add('bounce');
            setTimeout(() => typingIndicator.classList.remove('bounce'), 300);
        }
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
                endChatBtn.innerHTML = '<i class="fas fa-redo"></i><span>New Chat</span>';
            }
            
            chatActive = false;
            
            // Show disconnection toast
            showToast('Stranger disconnected', 'warning');
        }
    });
    
    // Add modern UI feedback for connection events
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
        if (chatActive) {
            addSystemMessage('Connection lost. Attempting to reconnect...');
            showToast('Connection lost. Reconnecting...', 'warning');
        }
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        if (chatActive) {
            addSystemMessage('Reconnected!');
            showToast('Reconnected successfully!', 'success');
        }
    });
    
    socket.on('reconnect_error', () => {
        console.log('Reconnection error');
        if (chatActive) {
            addSystemMessage('Failed to reconnect. Please refresh the page.');
            showToast('Connection failed. Please refresh.', 'error');
        }
    });

    // Event listeners with modern feedback
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            showScreen(waitingScreen);
            socket.emit('find match');
            
            // Add modern ripple effect on click
            addRippleEffect(startChatBtn);
        });
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
    
    // Existing event listeners with added modern visual feedback
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            socket.emit('cancel search');
            showScreen(welcomeScreen);
            addRippleEffect(cancelSearchBtn);
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
                
                if (endChatBtn) {
                    endChatBtn.innerHTML = '<i class="fas fa-redo"></i><span>New Chat</span>';
                }
                
                addSystemMessage('You disconnected');
                showToast('You ended the chat', 'info');
            } else {
                if (chatMessages) chatMessages.innerHTML = '';
                
                if (endChatBtn) {
                    endChatBtn.innerHTML = '<i class="fas fa-door-open"></i><span>End Chat</span>';
                }
                
                if (statusText) statusText.textContent = 'Finding a new stranger...';
                
                const statusDot = document.querySelector('.status-dot');
                if (statusDot) statusDot.style.backgroundColor = 'var(--warning)';
                
                showScreen(waitingScreen);
                socket.emit('find match');
                showToast('Looking for a new chat partner...', 'info');
            }
            
            addRippleEffect(endChatBtn);
        });
    }
    
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (chatActive) {
                const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
                addSystemMessage(`Suggested topic: ${randomTopic}`);
                addRippleEffect(newTopicBtn);
            }
        });
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
            
            if (chatActive) {
                socket.emit('typing');
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    socket.emit('stop typing');
                }, 1000);
            }
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 100);
            this.style.height = newHeight + 'px';
            
            // Check for slash commands
            const text = this.value.trim();
            if (text === '/help') {
                this.value = '';
                addSystemMessage('Available commands: /clear to clear chat, /nick to change nickname, /topic for a new topic suggestion');
            } else if (text === '/clear') {
                this.value = '';
                if (chatMessages) chatMessages.innerHTML = '';
                addSystemMessage('Chat history cleared');
            } else if (text === '/topic') {
                this.value = '';
                if (newTopicBtn) newTopicBtn.click();
            } else if (text === '/nick') {
                this.value = '';
                showNicknameDialog();
            }
        });
    }
    
    // Theme toggle event
    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            setTheme(themeSwitch.checked);
        });
    }
    
    // Toggle sidebar event
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }
    
    // Emoji picker events
    if (emojiBtn) {
        emojiBtn.addEventListener('click', toggleEmojiPicker);
    }
    
    if (toggleEmojiBtn) {
        toggleEmojiBtn.addEventListener('click', toggleEmojiPicker);
    }
    
    if (closeEmojiBtn) {
        closeEmojiBtn.addEventListener('click', toggleEmojiPicker);
    }
    
    // Emoji category selection
    emojiCategories.forEach(category => {
        category.addEventListener('click', () => {
            // Remove active class from all categories
            emojiCategories.forEach(cat => cat.classList.remove('active'));
            
            // Add active class to clicked category
            category.classList.add('active');
            
            // Show corresponding emoji group
            const categoryName = category.getAttribute('data-category');
            document.querySelectorAll('.emoji-group').forEach(group => {
                group.style.display = 'none';
            });
            
            const activeGroup = document.querySelector(`.emoji-group[data-category="${categoryName}"]`);
            if (activeGroup) activeGroup.style.display = 'flex';
        });
    });
    
    // Handle window resize for responsive layout
    window.addEventListener('resize', () => {
        isMobile = isIOS || isAndroid || window.innerWidth <= 768;
        
        // Update sidebar visibility based on screen size
        if (window.innerWidth <= 768) {
            isSidebarVisible = false;
            if (chatSidebar) {
                chatSidebar.style.transform = 'translateX(-100%)';
                chatSidebar.classList.remove('visible');
            }
        }
        
        // Close emoji picker on small screens when resizing
        if (window.innerWidth <= 576 && isEmojiPickerVisible) {
            isEmojiPickerVisible = false;
            if (emojiPicker) emojiPicker.style.display = 'none';
        }
    });
    
    // Handle click outside emoji picker to close it
    document.addEventListener('click', (e) => {
        if (isEmojiPickerVisible && 
            emojiPicker && 
            !emojiPicker.contains(e.target) && 
            e.target !== emojiBtn &&
            e.target !== toggleEmojiBtn) {
            isEmojiPickerVisible = false;
            emojiPicker.style.display = 'none';
        }
    });
    
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            addSystemMessage('File attachments coming soon!');
        });
    }
    
    function sendMessage() {
        if (!messageInput) return;
        
        const message = messageInput.value.trim();
        if (message && chatActive) {
            socket.emit('chat message', message);
            socket.emit('stop typing');
            addMessage(message, true);
            messageInput.value = '';
            messageInput.style.height = 'auto';
            messageInput.focus();
            
            if (isKeyboardVisible) {
                smoothScrollToBottom();
            }
        }
    }
    
    // Initialize UI components
    initializeUI();
    
    // Initialize dashboard
    loadUserProfile();
    initializeDashboard();
    
    // Add dashboard button to sidebar
    addDashboardButton();
});
