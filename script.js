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
    
    // DOM Elements - Updated for modern chat UI
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
    const emojiPicker = document.querySelector('.emoji-picker');
    const closeEmojiBtn = document.getElementById('close-emoji');
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
    let darkMode = document.documentElement.classList.contains('dark');
    
    // Initialize emoji groups
    const emojiGroups = {
        recent: ["😀", "👋", "👍", "❤️", "😊", "🔥", "🎉", "🤔", "😎", "😂", "😍", "🙌", "✨", "🙂", "👏"],
        smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "😍", "😘"],
        people: ["👋", "👌", "👍", "👎", "✌️", "🤞", "🤟", "🤙", "👏", "🙌", "🤝", "💪", "🧠", "👀", "🦴"],
        animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"],
        food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🥝", "🍅", "🥥", "🥑", "🍕"],
        travel: ["✈️", "🚗", "🚕", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚚", "🚀", "🛸", "🚲", "🛴", "⛵"],
        symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘"]
    };
    
    // Functions to switch between screens with enhanced animations
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
            s.style.opacity = '0';
            s.style.transform = 'translateY(20px)';
        });
        
        screen.classList.add('active');
        screen.classList.remove('hidden');
        
        // Add entrance animation
        setTimeout(() => {
            screen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            screen.style.opacity = '1';
            screen.style.transform = 'translateY(0)';
        }, 50);
        
        // Reset scroll position
        if (screen === chatScreen) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            window.scrollTo(0, 0);
        }
    }
    
    // Add a message to chat with advanced animations
    function addMessage(message, isSelf) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSelf ? 'self' : 'stranger');
        
        // Create message container for enhanced styling
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-content');
        
        // Add message text with advanced typography
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = message;
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('message-time');
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Assemble message structure
        messageContainer.appendChild(messageText);
        messageElement.appendChild(messageContainer);
        messageElement.appendChild(timestamp);
        
        // Add reaction button for interactive features
        const reactionBtn = document.createElement('button');
        reactionBtn.classList.add('reaction-btn');
        reactionBtn.innerHTML = '<i class="far fa-smile"></i>';
        reactionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleEmojiReactions(messageElement);
        });
        messageElement.appendChild(reactionBtn);
        
        // Create ripple effect animation
        messageElement.addEventListener('click', createRippleEffect);
        
        // Add to chat with entrance animation
        chatMessages.appendChild(messageElement);
        
        // Apply modern entrance animation
        messageElement.style.opacity = '0';
        messageElement.style.transform = isSelf ? 'translateX(50px)' : 'translateX(-50px)';
        
        setTimeout(() => {
            messageElement.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateX(0)';
        }, 10);
        
        // Play subtle sound for better interaction feedback
        playMessageSound(isSelf);
        
        // Smooth scroll to bottom
        smoothScrollToBottom();
    }
    
    // Create ripple effect for modern UI feedback
    function createRippleEffect(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const max = Math.max(this.offsetWidth, this.offsetHeight);
        ripple.style.width = ripple.style.height = max + 'px';
        
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.style.opacity = '0';
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 500);
        }, 500);
    }
    
    // Play message sounds for enhanced user experience
    function playMessageSound(isSelf) {
        const audio = new Audio();
        audio.volume = 0.2;
        audio.src = isSelf ? 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAHQAoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OD////////////////////////////////////////////////////////////////9MQ0BAQGQALAAAACkOZE7JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4zDAAAAOIAMiQAUALgAAQAwWJDI3qYAAAMAAABgAAYBoAIAMCCRlFA9El/qYNxhBwUAHAAAAAKESP6mDcYQcP3vy7u/f8h3g3EO/LeD8UYQ8Pd+XAYVxIQMJ5AgAIBAbo++QAQCAQCDBkiJIAAL/4zhwHEAGkAEiQAAANIAJEgAAA0gAkSAAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRI=' 
                : 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAHQAoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OD////////////////////////////////////////////////////////////////9MQ0BAQGQALAAAACLOZEqBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4zDAAAAOUAMiQAUAJYAAYA5zGwyICKEAAAMAAABgAAaAC4vygOCBmc+EAOA50COSGICgACY+4JYHAgAFBCHB4MJlAIxCLEUD4Ob/+bP//Aw/BwXMiAUnCSPUCCAAB8CFOdX0AAUh4AgAQl/yAACAAB7/+M4cCWAZkAHCQALACWAOEgAWAEsAcJAAsAJYA4SABYASwBwkACwAlgDhIAFgBLAHCQALACWAOEgAWAD/yjm4/DPwxIBkOlMACYAwJfFxYOABwDlMjOizff6YAXcG4Fj0BYUAzDIBP////x4VjkQAeOX///5MGQ8ZwYGQQaPII1BiLDR8OgrxVjxuG0dWAvEI////4////+M4cCqABpABIkAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRIAAANIAJEgAAA0gAkSAAADSACRI=';
        audio.play().catch(e => console.error('Audio play error:', e));
    }
    
    // Toggle emoji reactions panel for interactive messaging
    function toggleEmojiReactions(messageElement) {
        // Remove any existing reaction menus
        document.querySelectorAll('.reaction-menu').forEach(el => el.remove());
        
        // Create reaction menu
        const reactionMenu = document.createElement('div');
        reactionMenu.classList.add('reaction-menu');
        
        // Add popular emojis for quick reactions
        const reactions = ["👍", "❤️", "😂", "😮", "😢", "👏"];
        
        reactions.forEach(emoji => {
            const btn = document.createElement('button');
            btn.classList.add('reaction-item');
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                addReaction(messageElement, emoji);
                reactionMenu.remove();
            });
            reactionMenu.appendChild(btn);
        });
        
        // Position menu and animate entrance
        messageElement.appendChild(reactionMenu);
        reactionMenu.style.opacity = '0';
        reactionMenu.style.transform = 'translateY(10px) scale(0.95)';
        
        // Show with animation
        setTimeout(() => {
            reactionMenu.style.transition = 'all 0.2s ease';
            reactionMenu.style.opacity = '1';
            reactionMenu.style.transform = 'translateY(0) scale(1)';
        }, 10);
        
        // Auto-close when clicking elsewhere
        const closeHandler = (e) => {
            if (!reactionMenu.contains(e.target) && e.target !== messageElement.querySelector('.reaction-btn')) {
                reactionMenu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        
        // Add timeout to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    // Add reaction to message
    function addReaction(messageElement, emoji) {
        // Check if reactions container exists, otherwise create it
        let reactionsContainer = messageElement.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.classList.add('message-reactions');
            messageElement.querySelector('.message-content').appendChild(reactionsContainer);
        }
        
        // Check if this reaction already exists
        const existingReaction = Array.from(reactionsContainer.querySelectorAll('.reaction'))
            .find(r => r.textContent.includes(emoji));
        
        if (existingReaction) {
            // Increment counter
            const count = parseInt(existingReaction.getAttribute('data-count')) || 1;
            existingReaction.setAttribute('data-count', count + 1);
            existingReaction.querySelector('.count').textContent = count + 1;
            
            // Add bounce animation
            existingReaction.classList.add('animate-bounce');
            setTimeout(() => existingReaction.classList.remove('animate-bounce'), 1000);
        } else {
            // Create new reaction
            const reaction = document.createElement('div');
            reaction.classList.add('reaction');
            reaction.setAttribute('data-count', '1');
            
            reaction.innerHTML = `${emoji} <span class="count">1</span>`;
            
            // Add with animation
            reaction.style.transform = 'scale(0)';
            reactionsContainer.appendChild(reaction);
            
            setTimeout(() => {
                reaction.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                reaction.style.transform = 'scale(1)';
            }, 10);
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
        
        // Enhanced easing function for smooth scrolling
        function easeInOutCubic(t, b, c, d) {
            t /= d/2;
            if (t < 1) return c/2*t*t*t + b;
            t -= 2;
            return c/2*(t*t*t + 2) + b;
        }
        
        requestAnimationFrame(scrollAnimation);
    }
    
    // Add system message with enhanced styling
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        
        // Add icon for better visual cues
        const icon = document.createElement('i');
        icon.className = message.includes("disconnected") ? 'fas fa-unlink' : 
                        message.includes("connected") ? 'fas fa-link' :
                        'fas fa-info-circle';
        
        messageElement.appendChild(icon);
        
        // Add text with modern styling
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        messageElement.appendChild(textSpan);
        
        chatMessages.appendChild(messageElement);
        
        // Add fade-in animation
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.transition = 'opacity 0.3s ease';
            messageElement.style.opacity = '1';
        }, 10);
        
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
    
    // Update on resize with debounce for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            fixIOSViewportHeight();
            
            // Reset textarea height
            messageInput.style.height = 'auto';
        }, 200);
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
        
        // Add confetti celebration effect
        createConfetti();
        
        // Add system message with connection animation
        addSystemMessage('You are now connected with a stranger');
        
        // Focus on input field
        setTimeout(() => {
            messageInput.focus();
        }, 300);
    });
    
    // Create confetti celebration effect
    function createConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.classList.add('confetti-container');
        document.body.appendChild(confettiContainer);
        
        const colors = ['#4361ee', '#3a56d4', '#8d9eff', '#06d6a0', '#ffbe0b'];
        const shapes = ['square', 'circle', 'triangle'];
        
        // Create confetti pieces
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.classList.add('confetti');
                
                // Randomize confetti properties
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                confetti.classList.add(shape);
                
                const size = Math.random() * 10 + 5;
                confetti.style.width = `${size}px`;
                confetti.style.height = `${size}px`;
                
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.left = `${Math.random() * 100}vw`;
                
                // Add to container
                confettiContainer.appendChild(confetti);
                
                // Remove after animation completes
                setTimeout(() => {
                    confetti.remove();
                    if (confettiContainer.children.length === 0) {
                        confettiContainer.remove();
                    }
                }, 4000);
            }, i * 50);
        }
    }
    
    socket.on('chat message', (message) => {
        addMessage(message, false);
        typingIndicator.style.display = 'none';
        
        // Show notification if chat not in focus
        if (document.hidden) {
            showNotification('New message received');
        }
    });
    
    // Show browser notification
    function showNotification(message) {
        // Check if browser supports notifications and if permission is granted
        if (Notification && Notification.permission === 'granted') {
            new Notification('WhiBO Chat', {
                body: message,
                icon: '/favicon.ico'
            });
        } else if (Notification && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('WhiBO Chat', {
                        body: message,
                        icon: '/favicon.ico'
                    });
                }
            });
        }
    }
    
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
    
    // Button click events with enhanced interactions
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
        
        // Start radar animation
        document.querySelector('.radar').classList.add('active');
        
        // Add searching particles effect
        createSearchingParticles();
    });
    
    // Create animated particles for searching effect
    function createSearchingParticles() {
        const radar = document.querySelector('.radar');
        if (!radar) return;
        
        // Create random dots on the radar
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const dot = document.createElement('div');
                dot.classList.add('radar-dot');
                
                // Random position within radar
                const angle = Math.random() * 360;
                const distance = Math.random() * 40 + 10;
                
                dot.style.left = `calc(50% + ${Math.cos(angle * Math.PI / 180) * distance}px)`;
                dot.style.top = `calc(50% + ${Math.sin(angle * Math.PI / 180) * distance}px)`;
                
                radar.appendChild(dot);
                
                // Remove dot after animation
                setTimeout(() => {
                    dot.remove();
                }, 3000);
            }, i * 1500);
        }
    }
    
    cancelSearchBtn.addEventListener('click', () => {
        socket.emit('cancel search');
        showScreen(welcomeScreen);
        
        // Stop radar animation
        const radar = document.querySelector('.radar');
        if (radar) {
            radar.classList.remove('active');
        }
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
            
            // Add button ripple effect
            createButtonRipple(endChatBtn);
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
            
            // Add button ripple effect
            createButtonRipple(endChatBtn);
        }
    });
    
    // Button ripple animation for modern interaction
    function createButtonRipple(button) {
        const ripple = button.querySelector('.send-btn-ripple');
        if (ripple) {
            ripple.style.width = ripple.style.height = '0';
            ripple.style.opacity = '1';
            
            setTimeout(() => {
                const size = Math.max(button.offsetWidth, button.offsetHeight) * 2;
                ripple.style.width = ripple.style.height = `${size}px`;
                
                setTimeout(() => {
                    ripple.style.opacity = '0';
                    
                    setTimeout(() => {
                        ripple.style.width = ripple.style.height = '0';
                    }, 500);
                }, 300);
            }, 10);
        }
    }
    
    sendMessageBtn.addEventListener('click', () => {
        sendMessage();
        
        // Add button ripple effect
        createButtonRipple(sendMessageBtn);
    });
    
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
        
        // Add animation to input container
        if (this.value.trim().length > 0) {
            messageInput.classList.add('has-content');
        } else {
            messageInput.classList.remove('has-content');
        }
    });
    
    // Toggle emoji picker
    emojiBtn.addEventListener('click', () => {
        emojiPicker.classList.toggle('hidden');
        
        if (!emojiPicker.classList.contains('hidden')) {
            emojiPicker.style.transform = 'scale(1)';
            emojiPicker.style.opacity = '1';
            
            // Load emoji categories
            loadEmojiCategory('recent');
        } else {
            emojiPicker.style.transform = 'scale(0.95)';
            emojiPicker.style.opacity = '0';
        }
        
        // Add button animation
        emojiBtn.classList.add('active');
        setTimeout(() => {
            emojiBtn.classList.remove('active');
        }, 300);
    });
    
    // Close emoji picker
    closeEmojiBtn.addEventListener('click', () => {
        emojiPicker.classList.add('hidden');
        emojiPicker.style.transform = 'scale(0.95)';
        emojiPicker.style.opacity = '0';
    });
    
    // Load emoji category
    function loadEmojiCategory(category) {
        // Highlight active category
        document.querySelectorAll('.emoji-category').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelector(`.emoji-category[data-category="${category}"]`).classList.add('active');
        
        // Hide all emoji groups
        document.querySelectorAll('.emoji-group').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show selected category
        let group = document.querySelector(`.emoji-group[data-category="${category}"]`);
        
        // If group doesn't exist, create it
        if (!group) {
            group = document.createElement('div');
            group.classList.add('emoji-group');
            group.dataset.category = category;
            
            // Add emojis from this category
            if (emojiGroups[category]) {
                emojiGroups[category].forEach(emoji => {
                    const span = document.createElement('span');
                    span.classList.add('emoji-char');
                    span.dataset.emoji = emoji;
                    span.textContent = emoji;
                    
                    span.addEventListener('click', () => {
                        insertEmoji(emoji);
                    });
                    
                    group.appendChild(span);
                });
            }
            
            document.querySelector('.emoji-picker .p-2').appendChild(group);
        }
        
        group.classList.add('active');
    }
    
    // Insert emoji into message input
    function insertEmoji(emoji) {
        const startPos = messageInput.selectionStart;
        const endPos = messageInput.selectionEnd;
        const text = messageInput.value;
        
        messageInput.value = text.substring(0, startPos) + emoji + text.substring(endPos);
        
        // Set cursor position after emoji
        messageInput.selectionStart = messageInput.selectionEnd = startPos + emoji.length;
        
        // Focus back on input
        messageInput.focus();
        
        // Trigger input event to resize textarea
        messageInput.dispatchEvent(new Event('input'));
    }
    
    // Setup emoji category buttons
    document.querySelectorAll('.emoji-category').forEach(el => {
        el.addEventListener('click', () => {
            const category = el.dataset.category;
            loadEmojiCategory(category);
        });
    });
    
    // Attachment button with animation
    attachBtn.addEventListener('click', function() {
        // Show file input dialog (placeholder for now)
        showToast('Attachment feature coming soon!', 'info');
        
        // Add button animation
        this.classList.add('animate-bounce');
        setTimeout(() => {
            this.classList.remove('animate-bounce');
        }, 1000);
    });
    
    // Show toast notification
    function showToast(message, type = 'info') {
        // Check if toast container exists
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.classList.add('toast-container');
            document.body.appendChild(toastContainer);
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.classList.add('toast', `toast-${type}`);
        
        // Add icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Show with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto-remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            
            setTimeout(() => {
                toast.remove();
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && chatActive) {
            socket.emit('chat message', message);
            socket.emit('stop typing');
            addMessage(message, true);
            messageInput.value = '';
            
            // Reset textarea height
            messageInput.style.height = 'auto';
            messageInput.classList.remove('has-content');
            
            // Focus back on input
            messageInput.focus();
            
            // Create send button animation
            createButtonRipple(sendMessageBtn);
        }
    }
    
    // New Topic button with enhanced functionality
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (chatActive) {
                const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
                messageInput.value = randomTopic;
                messageInput.focus();
                
                // Trigger input event to resize textarea
                messageInput.dispatchEvent(new Event('input'));
                
                // Add button ripple effect
                const ripple = document.createElement('div');
                ripple.classList.add('ripple');
                newTopicBtn.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.style.opacity = '0';
                    setTimeout(() => ripple.remove(), 600);
                }, 600);
                
                showToast('New topic suggested!', 'info');
            }
        });
    }
    
    // Handle mobile keyboard adjustments
    if ('virtualKeyboard' in navigator) {
        navigator.virtualKeyboard.overlaysContent = true;
    }
    
    // Handle visibility change for notifications
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
    
    // Theme toggle functionality
    document.getElementById('theme-switch').addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.classList.add('dark');
            darkMode = true;
        } else {
            document.documentElement.classList.remove('dark');
            darkMode = false;
        }
    });
});
