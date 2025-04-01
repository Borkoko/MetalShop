document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Load user profile data
    loadUserProfile(userId);
    
    // Load user's listings
    loadUserListings(userId);
    
    // Load user's wishlist
    loadUserWishlist(userId);
    
    // Set up tab switching
    setupTabs();
    
    // Set up modals
    setupModals();
});

/**
 * Load and display user profile information
 */
function loadUserProfile(userId) {
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user data');
            return response.json();
        })
        .then(user => {
            // Update profile information
            document.getElementById('profile-name').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('profile-email').textContent = user.email;
            
            // Format date for "member since"
            const joinDate = new Date(user.createdAt);
            document.getElementById('profile-joined').textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Pre-fill edit profile form
            document.getElementById('edit-fname').value = user.firstName;
            document.getElementById('edit-lname').value = user.lastName;
            document.getElementById('edit-email').value = user.email;
        })
        .catch(error => {
            console.error('Error loading user profile:', error);
            showNotification('Failed to load profile data', 'error');
        });
}

/**
 * Load and display user's listings
 */
function loadUserListings(userId) {
    fetch(`http://localhost:3000/listings/user/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user listings');
            return response.json();
        })
        .then(listings => {
            const container = document.getElementById('my-listings-container');
            
            // Clear loading indicator
            container.innerHTML = '';
            
            if (listings.length === 0) {
                // Show message if no listings
                container.innerHTML = `
                    <div class="no-listings">
                        <i class="fas fa-box-open"></i>
                        <p>You don't have any listings yet.</p>
                    </div>
                `;
                return;
            }
            
            // Create listing cards
            listings.forEach(listing => {
                const card = createListingCard(listing, true);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading user listings:', error);
            
            const container = document.getElementById('my-listings-container');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load your listings. Please try again later.</p>
                </div>
            `;
        });
}

/**
 * Load and display user's wishlist
 */
function loadUserWishlist(userId) {
    fetch(`http://localhost:3000/wishlist/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch wishlist');
            return response.json();
        })
        .then(items => {
            const container = document.getElementById('wishlist-container');
            
            // Clear loading indicator
            container.innerHTML = '';
            
            if (items.length === 0) {
                // Show message if wishlist is empty
                container.innerHTML = `
                    <div class="no-listings">
                        <i class="fas fa-heart-broken"></i>
                        <p>Your wishlist is empty.</p>
                        <a href="listings.html" class="primary-button">
                            <i class="fas fa-search"></i> Browse Listings
                        </a>
                    </div>
                `;
                return;
            }
            
            // Create wishlist item cards
            items.forEach(item => {
                const card = createListingCard(item, false);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading wishlist:', error);
            
            const container = document.getElementById('wishlist-container');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load your wishlist. Please try again later.</p>
                </div>
            `;
        });
}

/**
 * Create a listing card element
 */
function createListingCard(listing, isOwnListing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    
    // Format price
    const formattedPrice = parseFloat(listing.price).toFixed(2);
    
    // Ensure image URL is absolute
    const imageUrl = ensureAbsoluteUrl(listing.imageUrl);
    
    // Basic card HTML
    card.innerHTML = `
        <div class="listing-image">
            <img src="${imageUrl}" 
                 alt="${listing.bandName} merchandise"
                 onerror="this.onerror=null; this.src='http://localhost:3000/placeholder.jpg';">
        </div>
        <div class="listing-details">
            <h3 class="listing-band">${listing.bandName}</h3>
            <div class="listing-meta">
                <span class="listing-size">${listing.size}</span>
                <span class="listing-gender">${listing.gender}</span>
                <span class="listing-condition">${listing.item_condition || ''}</span>
            </div>
            <div class="listing-price">$${formattedPrice}</div>
        </div>
    `;
    
    // Add action buttons if this is user's own listing
    if (isOwnListing) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'listing-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn edit-btn" title="Edit Listing">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" title="Delete Listing">
                <i class="fas fa-trash"></i>
            </button>
        `;
        card.appendChild(actionsDiv);
        
        // Add edit button event listener
        actionsDiv.querySelector('.edit-btn').addEventListener('click', function(event) {
            event.stopPropagation();
            window.location.href = `editListing.html?id=${listing.idTShirt}`;
        });
        
        // Add delete button event listener
        actionsDiv.querySelector('.delete-btn').addEventListener('click', function(event) {
            event.stopPropagation();
            openDeleteModal(listing.idTShirt, listing.bandName);
        });
    }
    
    // Make card clickable to view listing details
    card.addEventListener('click', () => {
        window.location.href = `listing.html?id=${listing.idTShirt}`;
    });
    
    return card;
}

/**
 * Ensure image URL is absolute
 */
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

/**
 * Set up tab switching functionality
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show target tab content, hide others
            tabContents.forEach(content => {
                if (content.id === `${targetTab}-content`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

/**
 * Set up modal functionality
 */
function setupModals() {
    // Delete modal
    const deleteModal = document.getElementById('delete-modal');
    const closeModalButton = document.getElementById('close-modal');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    
    // Close modal on close button click
    closeModalButton.addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    // Close modal on cancel button click
    cancelDeleteButton.addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    // Handle confirm delete action
    confirmDeleteButton.addEventListener('click', () => {
        const listingId = deleteModal.dataset.listingId;
        deleteListing(listingId);
    });
    
    // Edit profile modal
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileButton = document.getElementById('edit-profile-btn');
    const closeEditModalButton = document.getElementById('close-edit-modal');
    const cancelEditButton = document.getElementById('cancel-edit');
    const saveProfileButton = document.getElementById('save-profile');
    
    // Open edit profile modal
    editProfileButton.addEventListener('click', () => {
        editProfileModal.classList.add('active');
    });
    
    // Close edit profile modal
    closeEditModalButton.addEventListener('click', () => {
        editProfileModal.classList.remove('active');
    });
    
    // Cancel edit
    cancelEditButton.addEventListener('click', () => {
        editProfileModal.classList.remove('active');
    });
    
    // Save profile changes
    saveProfileButton.addEventListener('click', () => {
        updateUserProfile();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === deleteModal) {
            deleteModal.classList.remove('active');
        }
        if (event.target === editProfileModal) {
            editProfileModal.classList.remove('active');
        }
    });
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(listingId, bandName) {
    const deleteModal = document.getElementById('delete-modal');
    const modalBody = deleteModal.querySelector('.modal-body');
    
    // Store listing ID in modal for reference
    deleteModal.dataset.listingId = listingId;
    
    // Update modal content to include listing info
    modalBody.innerHTML = `
        <p>Are you sure you want to delete your <strong>${bandName}</strong> listing?</p>
        <p>This action cannot be undone.</p>
    `;
    
    // Show modal
    deleteModal.classList.add('active');
}

/**
 * Delete a listing from the server
 */
function deleteListing(listingId) {
    const userId = localStorage.getItem('userId');
    
    // Show loading state
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const originalButtonText = confirmDeleteButton.innerHTML;
    confirmDeleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    confirmDeleteButton.disabled = true;
    
    fetch(`http://localhost:3000/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to delete listing');
        return response.json();
    })
    .then(data => {
        // Close modal
        document.getElementById('delete-modal').classList.remove('active');
        
        // Show success notification
        showNotification('Listing deleted successfully', 'success');
        
        // Reload listings
        loadUserListings(userId);
    })
    .catch(error => {
        console.error('Error deleting listing:', error);
        showNotification('Failed to delete listing', 'error');
        
        // Reset button
        confirmDeleteButton.innerHTML = originalButtonText;
        confirmDeleteButton.disabled = false;
    });
}

/**
 * Update user profile
 */
function updateUserProfile() {
    const userId = localStorage.getItem('userId');
    
    // Get form data
    const fname = document.getElementById('edit-fname').value.trim();
    const lname = document.getElementById('edit-lname').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const password = document.getElementById('edit-password').value;
    
    // Validate
    if (!fname || !lname || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Create data object (only include password if changed)
    const userData = { fname, lname, email };
    if (password) {
        userData.password = password;
    }
    
    // Show loading state
    const saveButton = document.getElementById('save-profile');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;
    
    fetch(`http://localhost:3000/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    })
    .then(data => {
        // Close modal
        document.getElementById('edit-profile-modal').classList.remove('active');
        
        // Update localStorage with new user data
        localStorage.setItem('userName', data.firstName);
        
        // Show success notification
        showNotification('Profile updated successfully', 'success');
        
        // Reload profile data
        loadUserProfile(userId);
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
        
        // Reset button
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    });
}

/**
 * Show notification to the user
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    
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