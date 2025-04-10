/**
 * Admin dashboard functionality
 */

// Global variables
let allListings = [];
let allUsers = [];
let currentUserId = null;

// On page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    checkAdminAccess();
    
    // Set up tabs
    setupTabs();
    
    // Set up modals
    setupModals();
    
    // Set up search functionality
    setupSearch();
});

/**
 * Verify user has admin access
 */
function checkAdminAccess() {
    console.log('Function checkAdminAccess started');
    const userId = localStorage.getItem('userId');
    currentUserId = userId;
    
    if (!userId) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }
    
    // Fetch user data to check admin status
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user data');
            return response.json();
        })
        .then(userData => {
            if (!userData.isAdmin) {
                // Redirect to homepage if not admin
                showNotification('Access denied: Admin privileges required', 'error');
                window.location.href = 'mainpage.html';
                return;
            }
            
            // Load admin dashboard data
            loadDashboardData();
        })
        .catch(error => {
            console.error('Error checking admin status:', error);
            showNotification('Error verifying admin access', 'error');
            window.location.href = 'mainpage.html';
        });
}

/**
 * Load admin dashboard data
 */
function loadDashboardData() {
    console.log('Function loadDashboardData started');
    // Load all listings
    loadAllListings();
    
    // Load all users
    loadAllUsers();
}

/**
 * Load all listings for admin view
 */
function loadAllListings() {
    console.log('Function loadAllListings started');
    fetch('http://localhost:3000/listings')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch listings');
            return response.json();
        })
        .then(listings => {
            allListings = listings;
            renderListingsTable(listings);
        })
        .catch(error => {
            console.error('Error loading listings:', error);
            showNotification('Failed to load listings', 'error');
            
            const container = document.getElementById('listings-table');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load listings. Please try again later.</p>
                </div>
            `;
        });
}

/**
 * Render the listings table
 */
function renderListingsTable(listings) {
    const container = document.getElementById('listings-table');
    container.innerHTML = '';
    
    if (listings.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-box-open"></i>
                <p>No listings found.</p>
            </div>
        `;
        return;
    }
    
    // Sort listings by newest first
    listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Create table rows
    listings.forEach(listing => {
        const row = document.createElement('div');
        row.className = 'data-row listings-row';
        
        // Format date
        const createdDate = new Date(listing.createdAt);
        const formattedDate = createdDate.toLocaleDateString();
        
        // Format price
        const formattedPrice = parseFloat(listing.price).toFixed(2);
        
        // Ensure image URL is absolute
        const imageUrl = ensureAbsoluteUrl(listing.imageUrl);
        
        row.innerHTML = `
            <div class="data-cell">${listing.idTShirt}</div>
            <div class="data-cell">
                <div class="thumbnail-cell">
                    <img src="${imageUrl}" alt="Listing thumbnail" 
                         onerror="this.onerror=null; this.src='http://localhost:3000/placeholder.jpg';">
                </div>
            </div>
            <div class="data-cell">${listing.bandName}</div>
            <div class="data-cell">${listing.size}</div>
            <div class="data-cell">$${formattedPrice}</div>
            <div class="data-cell">${listing.fname} ${listing.lname}</div>
            <div class="data-cell">${formattedDate}</div>
            <div class="data-cell actions-cell">
                <button class="action-btn view-btn" title="View Listing" 
                        onclick="viewListing(${listing.idTShirt})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete Listing"
                        onclick="confirmDeleteListing(${listing.idTShirt}, '${listing.bandName}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(row);
    });
}

/**
 * Load all users for admin view
 */
function loadAllUsers() {
    fetch(`http://localhost:3000/admin/users?adminId=${currentUserId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch users');
            return response.json();
        })
        .then(users => {
            allUsers = users;
            renderUsersTable(users);
        })
        .catch(error => {
            console.error('Error loading users:', error);
            showNotification('Failed to load users', 'error');
            
            const container = document.getElementById('users-table');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load users. Please try again later.</p>
                </div>
            `;
        });
}

/**
 * Render the users table
 */
function renderUsersTable(users) {
    const container = document.getElementById('users-table');
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-users-slash"></i>
                <p>No users found.</p>
            </div>
        `;
        return;
    }
    
    // Sort users by newest first
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Create table rows
    users.forEach(user => {
        const row = document.createElement('div');
        row.className = 'data-row users-row';
        
        // Format date
        const createdDate = new Date(user.createdAt);
        const formattedDate = createdDate.toLocaleDateString();
        
        // Determine if delete button should be enabled or disabled
        const canDelete = !user.isAdmin && user.idUsers !== parseInt(currentUserId);
        const deleteButton = canDelete ? 
            `<button class="action-btn delete-btn" title="Delete User" onclick="confirmDeleteUser(${user.idUsers}, '${user.fname} ${user.lname}')">
                <i class="fas fa-trash"></i>
            </button>` :
            `<button class="action-btn delete-btn" title="Cannot delete admin accounts" disabled style="opacity: 0.5; cursor: not-allowed;">
                <i class="fas fa-trash"></i>
            </button>`;
        
        row.innerHTML = `
            <div class="data-cell">${user.idUsers}</div>
            <div class="data-cell">${user.fname} ${user.lname}</div>
            <div class="data-cell">${user.email}</div>
            <div class="data-cell">
                <span class="status-badge ${user.isAdmin ? 'status-admin' : 'status-user'}">
                    ${user.isAdmin ? 'Admin' : 'User'}
                </span>
            </div>
            <div class="data-cell">${formattedDate}</div>
            <div class="data-cell actions-cell">
                <button class="action-btn edit-btn" title="Edit User"
                        onclick="editUser(${user.idUsers})">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.idUsers !== parseInt(currentUserId) ? deleteButton : ''}
            </div>
        `;
        
        container.appendChild(row);
    });
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
    // Delete listing modal
    const deleteModal = document.getElementById('admin-delete-modal');
    const closeModalButton = deleteModal.querySelector('.close-btn');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    
    // Close modal on close button click
    closeModalButton.addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    // Close modal on cancel button click
    cancelDeleteButton.addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    // Click outside to close
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.remove('active');
        }
    });
    
    // User edit modal
    const userEditModal = document.getElementById('user-edit-modal');
    const closeEditModalButton = userEditModal.querySelector('.close-btn');
    const cancelEditButton = document.getElementById('cancel-user-edit');
    const saveUserEditButton = document.getElementById('save-user-edit');
    
    // Close modal on close button click
    closeEditModalButton.addEventListener('click', () => {
        userEditModal.classList.remove('active');
    });
    
    // Close modal on cancel button click
    cancelEditButton.addEventListener('click', () => {
        userEditModal.classList.remove('active');
    });
    
    // Save user changes
    saveUserEditButton.addEventListener('click', () => {
        saveUserChanges();
    });
    
    // Click outside to close
    userEditModal.addEventListener('click', (e) => {
        if (e.target === userEditModal) {
            userEditModal.classList.remove('active');
        }
    });
}

/**
 * Set up search functionality
 */
function setupSearch() {
    // Listings search
    const listingSearchInput = document.getElementById('listing-search');
    const listingSearchBtn = document.getElementById('listing-search-btn');
    
    // Search on button click
    listingSearchBtn.addEventListener('click', () => {
        const searchTerm = listingSearchInput.value.toLowerCase().trim();
        searchListings(searchTerm);
    });
    
    // Search on enter key
    listingSearchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = listingSearchInput.value.toLowerCase().trim();
            searchListings(searchTerm);
        }
    });
    
    // Users search
    const userSearchInput = document.getElementById('user-search');
    const userSearchBtn = document.getElementById('user-search-btn');
    
    // Search on button click
    userSearchBtn.addEventListener('click', () => {
        const searchTerm = userSearchInput.value.toLowerCase().trim();
        searchUsers(searchTerm);
    });
    
    // Search on enter key
    userSearchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = userSearchInput.value.toLowerCase().trim();
            searchUsers(searchTerm);
        }
    });
}

/**
 * Search listings by term
 */
function searchListings(term) {
    if (!term) {
        // If search is empty, show all listings
        renderListingsTable(allListings);
        return;
    }
    
    // Filter listings by search term
    const filtered = allListings.filter(listing => {
        return (
            listing.bandName.toLowerCase().includes(term) ||
            listing.size.toLowerCase().includes(term) ||
            listing.gender?.toLowerCase().includes(term) ||
            listing.item_condition?.toLowerCase().includes(term) ||
            listing.idTShirt.toString().includes(term) ||
            listing.fname.toLowerCase().includes(term) ||
            listing.lname.toLowerCase().includes(term) ||
            `${listing.fname} ${listing.lname}`.toLowerCase().includes(term) ||
            parseFloat(listing.price).toFixed(2).includes(term)
        );
    });
    
    // Render filtered listings
    renderListingsTable(filtered);
    showNotification(`Found ${filtered.length} matching listings`, 'info');
}

/**
 * Search users by term
 */
function searchUsers(term) {
    if (!term) {
        // If search is empty, show all users
        renderUsersTable(allUsers);
        return;
    }
    
    // Filter users by search term
    const filtered = allUsers.filter(user => {
        return (
            user.fname.toLowerCase().includes(term) ||
            user.lname.toLowerCase().includes(term) ||
            `${user.fname} ${user.lname}`.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.idUsers.toString().includes(term)
        );
    });
    
    // Render filtered users
    renderUsersTable(filtered);
    showNotification(`Found ${filtered.length} matching users`, 'info');
}

/**
 * View a listing in detail
 */
function viewListing(listingId) {
    window.location.href = `listing.html?id=${listingId}`;
}

/**
 * Confirm listing deletion
 */
function confirmDeleteListing(listingId, bandName) {
    const deleteModal = document.getElementById('admin-delete-modal');
    const modalHeader = deleteModal.querySelector('.modal-header h3');
    const modalBody = deleteModal.querySelector('.modal-body');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    
    // Update modal content
    modalHeader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm Listing Deletion';
    modalBody.innerHTML = `
        <p>Are you sure you want to delete the listing for <strong>${bandName}</strong>?</p>
        <p>Listing ID: ${listingId}</p>
        <p>This action cannot be undone.</p>
    `;
    
    // Set up delete action
    confirmDeleteButton.onclick = () => {
        deleteListing(listingId);
    };
    
    // Show modal
    deleteModal.classList.add('active');
}

/**
 * Delete a listing
 */
function deleteListing(listingId) {
    // Show loading state
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const originalButtonText = confirmDeleteButton.innerHTML;
    confirmDeleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    confirmDeleteButton.disabled = true;
    
    // Make admin delete request
    fetch(`http://localhost:3000/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            adminId: currentUserId
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to delete listing');
        return response.json();
    })
    .then(data => {
        // Close modal
        document.getElementById('admin-delete-modal').classList.remove('active');
        
        // Show success notification
        showNotification('Listing deleted successfully', 'success');
        
        // Reload listings
        loadAllListings();
    })
    .catch(error => {
        console.error('Error deleting listing:', error);
        showNotification('Failed to delete listing: ' + error.message, 'error');
        
        // Reset button
        confirmDeleteButton.innerHTML = originalButtonText;
        confirmDeleteButton.disabled = false;
    });
}

/**
 * Confirm user deletion
 */
function confirmDeleteUser(userId, userName) {
    const deleteModal = document.getElementById('admin-delete-modal');
    const modalHeader = deleteModal.querySelector('.modal-header h3');
    const modalBody = deleteModal.querySelector('.modal-body');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    
    // Update modal content
    modalHeader.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm User Deletion';
    modalBody.innerHTML = `
        <p>Are you sure you want to delete the user <strong>${userName}</strong>?</p>
        <p>User ID: ${userId}</p>
        <p>This action cannot be undone. All user listings and data will be permanently deleted.</p>
        <p class="warning">Note: This operation may take some time to complete.</p>
    `;
    
    // Add some styling to the warning
    const style = document.createElement('style');
    style.textContent = `
        .warning {
            color: #FFC107;
            font-weight: bold;
            margin-top: 1rem;
        }
    `;
    document.head.appendChild(style);
    
    // Set up delete action
    confirmDeleteButton.onclick = () => {
        deleteUser(userId);
    };
    
    // Show modal
    deleteModal.classList.add('active');
}

/**
 * Delete a user
 */
function deleteUser(userId) {
    // Show loading state
    const deleteModal = document.getElementById('admin-delete-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const originalButtonText = confirmDeleteButton.innerHTML;
    confirmDeleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    confirmDeleteButton.disabled = true;
    
    // Make admin delete request
    fetch(`http://localhost:3000/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            adminId: currentUserId
        })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found');
            } else if (response.status === 403) {
                throw new Error('You do not have permission to delete this user');
            } else {
                throw new Error('Failed to delete user');
            }
        }
        return response.json();
    })
    .then(data => {
        // Clean up
        confirmDeleteButton.innerHTML = originalButtonText;
        confirmDeleteButton.disabled = false;
        
        // Close modal
        deleteModal.classList.remove('active');
        
        // Show success notification
        showNotification('User deleted successfully', 'success');
        
        // Reload users
        loadAllUsers();
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user: ' + error.message, 'error');
        
        // Reset button
        confirmDeleteButton.innerHTML = originalButtonText;
        confirmDeleteButton.disabled = false;
        
        // Close modal
        deleteModal.classList.remove('active');
    });
}

/**
 * Open user edit modal
 */
function editUser(userId) {
    const user = allUsers.find(u => u.idUsers === userId);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    // Fill edit form with user data
    document.getElementById('edit-user-name').value = `${user.fname} ${user.lname}`;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-admin').checked = !!user.isAdmin;
    
    // Store user ID in form for reference
    const userEditModal = document.getElementById('user-edit-modal');
    userEditModal.dataset.userId = userId;
    
    userEditModal.classList.add('active');
}

function saveUserChanges() {
    const userEditModal = document.getElementById('user-edit-modal');
    const userId = userEditModal.dataset.userId;
    const isAdmin = document.getElementById('edit-user-admin').checked;
    
    const saveButton = document.getElementById('save-user-edit');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveButton.disabled = true;
    
    fetch(`http://localhost:3000/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            adminId: currentUserId,
            isAdmin: isAdmin
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    })
    .then(data => {
        userEditModal.classList.remove('active');
        
        showNotification('User updated successfully', 'success');
        
        loadAllUsers();
    })
    .catch(error => {
        console.error('Error updating user:', error);
        showNotification('Failed to update user: ' + error.message, 'error');
        
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
    });
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