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
    
    // New UI Elements
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const chatSidebar = document.querySelector('.chat-sidebar');
    const emojiBtn = document.getElementById('emoji-btn');
    const toggleEmojiBtn = document.getElementById('toggle-emoji-btn');
    const emojiPicker = document.querySelector('.emoji-picker');
    const closeEmojiBtn = document.getElementById('close-emoji');
    const emojiCategories = document.querySelectorAll('.emoji-category');
    const emojiChars = document.querySelectorAll('.emoji-char');
    const attachBtn = document.getElementById('attach-btn');
    
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
            // Set display for chat screen when it becomes active
            if (screen === chatScreen) {
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
    
    // Add a message to chat
    function addMessage(message, isSelf) {
        if (!chatMessages) return;
        
        const now = new Date();
        
        // Check if we need a date separator
        checkDateSeparator(now);
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSelf ? 'self' : 'stranger');
        
        // Add animation class based on message sender
        messageElement.classList.add(isSelf ? 'message-in-right' : 'message-in-left');
        
        // Add formatted time as a data attribute
        const timeString = formatTime(now);
        messageElement.setAttribute('data-time', timeString);
        
        // Add message content wrapper with nickname
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        // Add nickname span
        const nicknameSpan = document.createElement('div');
        nicknameSpan.className = 'message-nickname';
        nicknameSpan.textContent = isSelf ? userNickname : 'Stranger';
        contentElement.appendChild(nicknameSpan);
        
        // Add message text
        const messageTextSpan = document.createElement('div');
        messageTextSpan.className = 'message-text';
        messageTextSpan.textContent = message;
        contentElement.appendChild(messageTextSpan);
        
        // Add translation button for stranger messages
        if (!isSelf) {
            const translateButton = document.createElement('button');
            translateButton.className = 'translate-btn';
            translateButton.innerHTML = '<i class="fas fa-language"></i>';
            translateButton.title = 'Translate message';
            translateButton.addEventListener('click', () => translateMessage(messageElement));
            contentElement.appendChild(translateButton);
        }
        
        messageElement.appendChild(contentElement);
        chatMessages.appendChild(messageElement);
        
        // Play notification sound for incoming messages
        if (!isSelf && userSettings.notificationSound) {
            playNotificationSound();
        }
        
        // Smooth scroll to bottom if auto-scroll is enabled
        if (userSettings.autoScroll) {
            smoothScrollToBottom();
        }
        
        // Add haptic feedback on mobile
        if (!isSelf && navigator.vibrate && isMobile) {
            navigator.vibrate(50);
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            messageElement.classList.remove('message-in-right', 'message-in-left');
        }, 500);
    }
    
    // Add system message
    function addSystemMessage(message) {
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        
        // Add icon for better visual hierarchy
        messageElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span class="message-text">${message}</span>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Smooth scroll to bottom
        smoothScrollToBottom();
    }
    
    // Play notification sound
    function playNotificationSound() {
        try {
            // Use a short beep sound in base64 to avoid loading external files
            const sound = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            sound.volume = 0.5; // Set a reasonable volume
            sound.play().catch(e => console.error('Error playing sound:', e));
        } catch (e) {
            console.error('Error with notification sound:', e);
        }
    }
    
    // Translate message (simulated)
    function translateMessage(messageElement) {
        const messageText = messageElement.querySelector('.message-text').textContent;
        
        // Show loading indicator
        const translateBtn = messageElement.querySelector('.translate-btn');
        if (translateBtn) {
            translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        // Simulate translation (in a real app, you would call a translation API)
        setTimeout(() => {
            // This is a simulation - in a real app you would call an actual translation API
            const translatedText = `[Translated] ${messageText}`;
            
            // Add translation to message
            const messageTextElement = messageElement.querySelector('.message-text');
            messageTextElement.innerHTML = `
                <div class="original-message">${messageText}</div>
                <div class="translated-message">${translatedText}</div>
            `;
            
            // Reset button
            if (translateBtn) {
                translateBtn.innerHTML = '<i class="fas fa-language"></i>';
            }
        }, 1000);
    }
    
    // Smooth scroll to bottom
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
    
    // Toggle chat sidebar visibility
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
    
    // Toggle emoji picker visibility
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
    }
    
    // Show dialog to change nickname
    function showNicknameDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog nickname-dialog';
        dialog.innerHTML = `
            <h3>Change Your Nickname</h3>
            <div class="input-group">
                <input type="text" id="nickname-input" value="${userNickname}" maxlength="20">
                <button id="generate-nickname" title="Generate random nickname">
                    <i class="fas fa-dice"></i>
                </button>
            </div>
            <div class="dialog-actions">
                <button id="cancel-nickname" class="btn secondary-btn">Cancel</button>
                <button id="save-nickname" class="btn primary-btn">Save</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus on input
        const nicknameInput = document.getElementById('nickname-input');
        if (nicknameInput) {
            setTimeout(() => {
                nicknameInput.focus();
                nicknameInput.select();
            }, 100);
        }
        
        // Generate random nickname
        document.getElementById('generate-nickname').addEventListener('click', () => {
            const newRandomNickname = generateRandomNickname();
            document.getElementById('nickname-input').value = newRandomNickname;
        });
        
        // Cancel button
        document.getElementById('cancel-nickname').addEventListener('click', () => {
            overlay.remove();
        });
        
        // Save button
        document.getElementById('save-nickname').addEventListener('click', () => {
            const newNickname = document.getElementById('nickname-input').value.trim();
            if (newNickname) {
                userNickname = newNickname;
                localStorage.setItem('whibo-nickname', userNickname);
                
                // Update displayed nickname
                const nicknameValue = document.querySelector('.nickname-value');
                if (nicknameValue) {
                    nicknameValue.textContent = userNickname;
                }
                
                overlay.remove();
                
                // If in chat, update system message
                if (chatActive) {
                    addSystemMessage(`You changed your nickname to ${userNickname}`);
                    socket.emit('set nickname', userNickname);
                }
            }
        });

        // Handle Enter key press
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('save-nickname').click();
            }
        });
    }
    
    // Initialize UI components
    function initializeUI() {
        // Set up theme
        initTheme();
        
        // Initialize nickname
        setupNickname();
        
        // Initialize emoji picker
        initializeEmojiPicker();
        
        // Apply user settings
        applyUserSettings();
        
        // Initialize search progress animation
        if (progressBar) {
            progressBar.style.width = '0%';
            
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
    
    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
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
        }, 300);
    });
    
    socket.on('chat message', (message) => {
        addMessage(message, false);
        if (typingIndicator) typingIndicator.style.display = 'none';
    });
    
    socket.on('typing', () => {
        if (typingIndicator) typingIndicator.style.display = 'flex';
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
        }
    });
    
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
        if (chatActive) {
            addSystemMessage('Connection lost. Attempting to reconnect...');
        }
    });
    
    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        if (chatActive) {
            addSystemMessage('Reconnected!');
        }
    });
    
    socket.on('reconnect_error', () => {
        console.log('Reconnection error');
        if (chatActive) {
            addSystemMessage('Failed to reconnect. Please refresh the page.');
        }
    });

    // Event listeners
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            showScreen(waitingScreen);
            socket.emit('find match');
        });
    }
    
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            socket.emit('cancel search');
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
                
                if (endChatBtn) {
                    endChatBtn.innerHTML = '<i class="fas fa-redo"></i><span>New Chat</span>';
                }
                
                addSystemMessage('You disconnected');
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
            }
        });
    }
    
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (chatActive) {
                const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
                addSystemMessage(`Suggested topic: ${randomTopic}`);
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
});
