// Load user's listings
async function loadUserListings(userId) {
    const container = document.getElementById('my-listings-container');
    
    try {
        // Show loading indicator
        container.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your listings...</span>
            </div>
        `;
        
        const response = await fetch(`http://localhost:3000/listings?userId=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch listings');
        }
        
        const listings = await response.json();
        
        // Clear container
        container.innerHTML = '';
        
        if (listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>You don't have any listings yet.</p>
                    <a href="createListing.html" class="primary-button">
                        <i class="fas fa-plus"></i> Create a Listing
                    </a>
                </div>
            `;
            return;
        }
        
        // Create listing cards
        listings.forEach(listing => {
            const card = document.createElement('div');
            card.className = 'listing-card';
            card.dataset.id = listing.idTShirt;
            
            // Format price
            const formattedPrice = parseFloat(listing.price).toFixed(2);
            
            // Properly format the image URL
            const imageUrl = ensureAbsoluteUrl(listing.imageUrl);
            
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
                    <div class="listing-actions">
                        <button class="listing-action-btn view-listing-btn" title="View Listing" onclick="viewListing(${listing.idTShirt}, event)">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="listing-action-btn edit-listing-btn" title="Edit Listing" onclick="editListing(${listing.idTShirt}, event)">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="listing-action-btn delete-listing-btn" title="Delete Listing" onclick="openDeleteListingModal(${listing.idTShirt}, '${listing.bandName}', '${imageUrl}', event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading listings:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load listings. Please try again later.</p>
            </div>
        `;
    }
}

// Load user's wishlist
async function loadUserWishlist(userId) {
    const container = document.getElementById('wishlist-container');
    
    try {
        // Show loading indicator
        container.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading your wishlist...</span>
            </div>
        `;
        
        const response = await fetch(`http://localhost:3000/wishlist/${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch wishlist');
        }
        
        const wishlistItems = await response.json();
        
        // Clear container
        container.innerHTML = '';
        
        if (wishlistItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
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
        wishlistItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'listing-card';
            card.dataset.id = item.tshirtId;
            
            // Format price
            const formattedPrice = parseFloat(item.price).toFixed(2);
            
            // Properly format the image URL (assuming item has imageUrl)
            const imageUrl = ensureAbsoluteUrl(item.imageUrl);
            
            card.innerHTML = `
                <div class="listing-image">
                    <img src="${imageUrl}" 
                         alt="${item.bandName} merchandise"
                         onerror="this.onerror=null; this.src='http://localhost:3000/placeholder.jpg';">
                </div>
                <div class="listing-details">
                    <h3 class="listing-band">${item.bandName}</h3>
                    <div class="listing-meta">
                        <span class="listing-size">${item.size}</span>
                        <span class="listing-gender">${item.gender}</span>
                        <span class="listing-condition">${item.item_condition || ''}</span>
                    </div>
                    <div class="listing-price">$${formattedPrice}</div>
                    <div class="listing-actions">
                        <button class="listing-action-btn view-listing-btn" title="View Listing" onclick="viewListing(${item.tshirtId}, event)">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="listing-action-btn delete-listing-btn" title="Remove from Wishlist" onclick="removeFromWishlist(${item.tshirtId}, event)">
                            <i class="fas fa-heart-broken"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading wishlist:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load wishlist. Please try again later.</p>
            </div>
        `;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            activateTab(tabName);
            // Update URL hash
            window.location.hash = tabName;
        });
    });
    
    // Profile actions
    document.getElementById('edit-profile-btn').addEventListener('click', openEditProfileModal);
    document.getElementById('change-password-btn').addEventListener('click', openChangePasswordModal);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Form submissions
    document.getElementById('edit-profile-form').addEventListener('submit', handleEditProfileSubmit);
    document.getElementById('change-password-form').addEventListener('submit', handleChangePasswordSubmit);
    
    // Delete listing confirmation
    document.getElementById('confirm-delete-listing').addEventListener('click', confirmDeleteListing);
}

// Activate a tab
function activateTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab-content`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Add active class to selected tab button
    const selectedButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Load content based on the selected tab
    const userId = localStorage.getItem('userId');
    if (userId) {
        if (tabName === 'listings') {
            loadUserListings(userId);
        } else if (tabName === 'wishlist') {
            loadUserWishlist(userId);
        }
    }
}

// Ensure image URL is absolute
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

// Setup password strength meter
function setupPasswordStrengthMeter() {
    const passwordInput = document.getElementById('new-password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const meter = document.getElementById('strength-meter-fill');
        const info = document.getElementById('password-info');
        
        // Simple strength calculation
        let strength = 0;
        if (password.length >= 6) strength += 25;
        if (password.length >= 8) strength += 15;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;
        
        // Update meter
        meter.style.width = strength + '%';
        
        // Change color based on strength
        if (strength < 30) {
            meter.style.backgroundColor = '#ff4444';
            info.textContent = 'Password is weak';
        } else if (strength < 60) {
            meter.style.backgroundColor = '#ffbb33';
            info.textContent = 'Password is moderate';
        } else {
            meter.style.backgroundColor = '#00C851';
            info.textContent = 'Password is strong';
        }
        
        if (password.length < 6) {
            info.textContent = 'Password must be at least 6 characters';
        }
    });
}

// Logout function
function logout() {
    // Clear all authentication data from localStorage
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginTime");
    
    // Call logout endpoint (optional)
    fetch("http://localhost:3000/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }).catch(err => console.error("Error logging out:", err));
    
    // Redirect to login page
    window.location.href = "login.html";
}

// Handle edit profile form submission
async function handleEditProfileSubmit(event) {
    event.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('You must be logged in to update your profile', 'error');
        return;
    }
    
    // Get form values
    const firstName = document.getElementById('edit-fname').value.trim();
    const lastName = document.getElementById('edit-lname').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    
    // Simple validation
    if (!firstName || !lastName || !email) {
        showFormMessage('edit-profile-message', 'All fields are required', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFormMessage('edit-profile-message', 'Please enter a valid email address', 'error');
        return;
    }
    
    // Update button to loading state
    const submitBtn = document.querySelector('#edit-profile-form .save-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`http://localhost:3000/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fname: firstName, 
                lname: lastName, 
                email: email 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local storage
            localStorage.setItem('userName', firstName);
            localStorage.setItem('userEmail', email);
            
            // Update profile information
            document.getElementById('profile-name').textContent = `${firstName} ${lastName}`;
            document.getElementById('fname').value = firstName;
            document.getElementById('lname').value = lastName;
            document.getElementById('email').value = email;
            
            // Show success message
            showFormMessage('edit-profile-message', 'Profile updated successfully!', 'success');
            showNotification('Profile updated successfully!', 'success');
            
            // Close modal after short delay
            setTimeout(() => {
                closeModal(document.getElementById('edit-profile-modal'));
                
                // Reload user profile to refresh the data
                loadUserProfile(userId);
            }, 1500);
        } else {
            showFormMessage('edit-profile-message', data.error || 'Failed to update profile', 'error');
            
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showFormMessage('edit-profile-message', 'Connection error. Please try again.', 'error');
        
        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Handle change password form submission
async function handleChangePasswordSubmit(event) {
    event.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('You must be logged in to change your password', 'error');
        return;
    }
    
    // Get form values
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Simple validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showFormMessage('change-password-message', 'All fields are required', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showFormMessage('change-password-message', 'Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showFormMessage('change-password-message', 'New password and confirmation do not match', 'error');
        return;
    }
    
    // Update button to loading state
    const submitBtn = document.querySelector('#change-password-form .save-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`http://localhost:3000/users/${userId}/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                currentPassword: currentPassword, 
                newPassword: newPassword 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            showFormMessage('change-password-message', 'Password changed successfully!', 'success');
            showNotification('Password changed successfully!', 'success');
            
            // Reset form
            document.getElementById('change-password-form').reset();
            
            // Close modal after short delay
            setTimeout(() => {
                closeModal(document.getElementById('change-password-modal'));
            }, 1500);
        } else {
            showFormMessage('change-password-message', data.error || 'Failed to change password', 'error');
            
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Password change error:', error);
        showFormMessage('change-password-message', 'Connection error. Please try again.', 'error');
        
        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Modal functions
function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Enable scrolling
    }
}

function openEditProfileModal() {
    // Ensure form is reset and pre-populated with current data
    if (window.userData) {
        document.getElementById('edit-fname').value = window.userData.firstName;
        document.getElementById('edit-lname').value = window.userData.lastName;
        document.getElementById('edit-email').value = window.userData.email;
    }
    
    // Clear previous messages
    document.getElementById('edit-profile-message').style.display = 'none';
    
    // Open the modal
    openModal(document.getElementById('edit-profile-modal'));
}

function openChangePasswordModal() {
    // Reset form
    document.getElementById('change-password-form').reset();
    
    // Reset password strength meter
    const meter = document.getElementById('strength-meter-fill');
    if (meter) {
        meter.style.width = '0%';
    }
    
    // Clear previous messages
    document.getElementById('change-password-message').style.display = 'none';
    
    // Open the modal
    openModal(document.getElementById('change-password-modal'));
}

async function confirmDeleteListing() {
    if (!listingToDelete) return;
    
    // Update button to loading state
    const deleteBtn = document.getElementById('confirm-delete-listing');
    const originalBtnText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    try {
        const response = await fetch(`http://localhost:3000/listings/${listingToDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            // Show success message
            showFormMessage('delete-listing-message', 'Listing deleted successfully!', 'success');
            showNotification('Listing deleted successfully!', 'success');
            
            // Close modal after short delay
            setTimeout(() => {
                closeModal(document.getElementById('delete-listing-modal'));
                
                // Reload listings to refresh the data
                const userId = localStorage.getItem('userId');
                if (userId) {
                    loadUserListings(userId);
                }
            }, 1500);
        } else {
            const data = await response.json();
            showFormMessage('delete-listing-message', data.error || 'Failed to delete listing', 'error');
            
            // Reset button
            deleteBtn.innerHTML = originalBtnText;
            deleteBtn.disabled = false;
        }
    } catch (error) {
        console.error('Delete listing error:', error);
        showFormMessage('delete-listing-message', 'Connection error. Please try again.', 'error');
        
        // Reset button
        deleteBtn.innerHTML = originalBtnText;
        deleteBtn.disabled = false;
    }
}

// Wishlist functions
async function removeFromWishlist(tshirtId, event) {
    if (event) {
        event.stopPropagation(); // Prevent card click
    }
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('You must be logged in to modify wishlist', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                tshirtId: tshirtId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Item removed from wishlist', 'success');
            
            // Reload wishlist to refresh the data
            loadUserWishlist(userId);
        } else {
            showNotification(data.error || 'Failed to remove from wishlist', 'error');
        }
    } catch (error) {
        console.error('Wishlist error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// Helper functions
function showFormMessage(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.className = 'form-message';
    messageElement.classList.add(type);
    messageElement.style.display = 'block';
}

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