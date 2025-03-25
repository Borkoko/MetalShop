document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        // Redirect to login if not authenticated
        console.error('No user ID found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    console.log('Attempting to load chat list for user ID:', userId);

    // Load chat list when page loads
    loadChatList(userId);

    // Set up event listeners
    setupChatListeners();

    // Check if chat parameters are in URL for direct chat initiation
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('sellerId');
    const tshirtId = urlParams.get('tshirtId');
    
    if (sellerId && tshirtId) {
        initiateChat(sellerId, tshirtId);
    }
});

// Open chat window for a specific tshirt and user
function openChatWindow(tshirtId, otherUserId) {
    const userId = localStorage.getItem('userId');
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');

    // Store tshirt and user IDs on the chat window for later use
    chatWindow.dataset.tshirtId = tshirtId;
    chatWindow.dataset.otherUserId = otherUserId;

    // Make the chat window visible
    chatWindow.classList.add('active');

    // Clear previous messages
    chatMessages.innerHTML = '';

    // Fetch chat history
    fetch(`http://localhost:3000/chat/history?senderId=${userId}&receiverId=${otherUserId}&tshirtId=${tshirtId}`)
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch chat history');
        return response.json();
    })
    .then(messages => {
        // Render messages
        if (messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-chat-selected">
                    <i class="fas fa-comment-dots"></i>
                    <p>Start a conversation</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            const isSentByCurrentUser = msg.senderId === parseInt(userId);
            
            messageElement.classList.add('chat-message');
            messageElement.classList.add(isSentByCurrentUser ? 'sent' : 'received');
            
            messageElement.innerHTML = `
                <div class="message-content">${msg.message}</div>
                <div class="message-time">${formatMessageTime(msg.sentAt)}</div>
            `;
            
            chatMessages.appendChild(messageElement);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .catch(error => {
        console.error('Error fetching chat history:', error);
        chatMessages.innerHTML = `
            <div class="no-chat-selected">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load chat history</p>
            </div>
        `;
    });
}

// Initiate a new chat from a listing
function initiateChat(sellerId, tshirtId) {
    const userId = localStorage.getItem('userId');
    
    // Prevent chatting with self
    if (userId === sellerId) {
        showNotification('You cannot chat with yourself', 'error');
        return;
    }

    // Create chat
    fetch('http://localhost:3000/chat/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            senderId: userId,
            receiverId: sellerId,
            tshirtId: tshirtId
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to create chat');
        return response.json();
    })
    .then(() => {
        // Open the chat window
        openChatWindow(tshirtId, sellerId);
    })
    .catch(error => {
        console.error('Chat initiation error:', error);
        showNotification('Failed to start chat. Please try again.', 'error');
    });
}

function loadChatList(userId) {
    const chatListContainer = document.getElementById('chat-list');
    
    // Add full URL and error handling
    fetch(`http://localhost:3000/chat/list/${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        
        // Log full response for debugging
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch chat list');
            }
            return data;
        });
    })
    .then(chats => {
        console.log('Chats received:', chats);

        if (chats.length === 0) {
            chatListContainer.innerHTML = `
                <div class="no-chats">
                    <i class="fas fa-comment-slash"></i>
                    <p>No chats yet. Start a conversation on a listing!</p>
                </div>
            `;
            return;
        }

        chatListContainer.innerHTML = chats.map(chat => `
            <div class="chat-preview" 
                 data-tshirt-id="${chat.idTShirt}" 
                 data-other-user-id="${chat.otherUserId}">
                <div class="chat-preview-image">
                    <img src="${ensureAbsoluteUrl(chat.imageUrl)}" 
                         alt="${chat.bandName} T-Shirt"
                         onerror="this.onerror=null; this.src='http://localhost:3000/placeholder.jpg';">
                </div>
                <div class="chat-preview-details">
                    <div class="chat-preview-header">
                        <h3>${chat.bandName} T-Shirt</h3>
                        <span class="chat-preview-size">${chat.size}</span>
                    </div>
                    <div class="chat-preview-user">
                        <span>Chat with ${chat.otherUserFirstName} ${chat.otherUserLastName}</span>
                    </div>
                    <p class="chat-preview-last-message">
                        ${chat.lastMessage || 'No messages yet'}
                    </p>
                </div>
            </div>
        `).join('');

        // Add click event to chat previews
        document.querySelectorAll('.chat-preview').forEach(preview => {
            preview.addEventListener('click', () => {
                const tshirtId = preview.dataset.tshirtId;
                const otherUserId = preview.dataset.otherUserId;
                openChatWindow(tshirtId, otherUserId);
            });
        });
    })
    .catch(error => {
        console.error('Detailed error loading chat list:', error);
        
        // Detailed error handling
        const errorMessage = error.message || 'Unknown error occurred';
        chatListContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load chats: ${errorMessage}</p>
                <p>Please check your connection or try again later.</p>
            </div>
        `;
    });
}

function setupChatListeners() {
    const chatForm = document.getElementById('chat-form');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatWindow = document.getElementById('chat-window');
    const chatCloseBtn = document.getElementById('chat-close-btn');

    // Send message
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = chatMessageInput.value.trim();
        
        if (!message) return;

        const userId = localStorage.getItem('userId');
        const tshirtId = chatWindow.dataset.tshirtId;
        const otherUserId = chatWindow.dataset.otherUserId;

        fetch('http://localhost:3000/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderId: userId,
                receiverId: otherUserId,
                tshirtId: tshirtId,
                message: message
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to send message');
            
            // Clear input and refresh chat
            chatMessageInput.value = '';
            openChatWindow(tshirtId, otherUserId);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        });
    });

    // Close chat window
    chatCloseBtn.addEventListener('click', () => {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.classList.remove('active');
    });
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function ensureAbsoluteUrl(url) {
    if (!url) return 'http://localhost:3000/placeholder.jpg';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    if (url.startsWith('/')) {
        return `http://localhost:3000${url}`;
    }
    
    return `http://localhost:3000/${url}`;
}

// Optional: Show notification for error/success
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const messageElement = notification.querySelector('.notification-message');
    if (!messageElement) return;
    
    // Set message
    messageElement.textContent = message;
    
    // Reset classes and add new ones
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('visible');
    
    // Hide after a delay
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 3000);
}