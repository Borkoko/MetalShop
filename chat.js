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
});

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