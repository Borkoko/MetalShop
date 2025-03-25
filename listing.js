// Global variables
let listingData = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Get listing ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');

    if (!listingId) {
        showErrorPage('No listing ID provided');
        return;
    }

    // Fetch listing details
    fetchListingDetails(listingId);

    // Set up event listeners
    setupEventListeners(listingId);
});

// Fetch listing details from server
function fetchListingDetails(listingId) {
    fetch(`http://localhost:3000/listings/${listingId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch listing details');
            return response.json();
        })
        .then(data => {
            listingData = data;
            populateListingDetails(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorPage('Failed to load listing details');
        });
}

// Populate listing details in the page
function populateListingDetails(listing) {
    // Update page title
    document.title = `${listing.bandName} T-Shirt | MetalShop`;

    // Images
    setupImageGallery(listing.images);

    // Basic details
    document.getElementById('band-name').textContent = listing.bandName;
    document.getElementById('size-info').textContent = listing.size;
    document.getElementById('gender-info').textContent = listing.gender;
    document.getElementById('condition-info').textContent = listing.item_condition;
    document.getElementById('price-info').textContent = `$${parseFloat(listing.price).toFixed(2)}`;
    document.getElementById('description-text').textContent = listing.description;

    // Seller info
    document.getElementById('seller-name').textContent = `${listing.fname} ${listing.lname}`;
    document.getElementById('seller-email').textContent = listing.email;
}

// Setup image gallery
function setupImageGallery(images) {
    const mainImage = document.getElementById('main-image');
    const thumbnailGallery = document.getElementById('thumbnail-gallery');

    // If no images, use placeholder
    if (!images || images.length === 0) {
        mainImage.src = 'http://localhost:3000/placeholder.jpg';
        return;
    }

    // Set main image
    mainImage.src = ensureAbsoluteUrl(images[0]);

    // Create thumbnails
    images.forEach((imageUrl, index) => {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = ensureAbsoluteUrl(imageUrl);
        thumbnailImg.alt = `Thumbnail ${index + 1}`;
        
        // First thumbnail is active by default
        if (index === 0) {
            thumbnailImg.classList.add('active');
        }

        // Click event to change main image
        thumbnailImg.addEventListener('click', () => {
            // Remove active class from all thumbnails
            thumbnailGallery.querySelectorAll('img').forEach(img => {
                img.classList.remove('active');
            });

            // Add active class to clicked thumbnail
            thumbnailImg.classList.add('active');

            // Update main image
            mainImage.src = ensureAbsoluteUrl(imageUrl);
        });

        thumbnailGallery.appendChild(thumbnailImg);
    });
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

// Setup event listeners
function setupEventListeners(listingId) {
    // Wishlist button
    const wishlistBtn = document.getElementById('wishlist-btn');
    wishlistBtn.addEventListener('click', addToWishlist);

    // Contact seller button
    const contactSellerBtn = document.getElementById('contact-seller-btn');
    contactSellerBtn.addEventListener('click', initiateChatWithSeller);
}

// Add item to wishlist
function addToWishlist() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please log in to add to wishlist', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Ensure we have a listing
    if (!listingData) {
        showNotification('Unable to add listing to wishlist', 'error');
        return;
    }

    // Send wishlist request
    fetch('http://localhost:3000/wishlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            tshirtId: listingData.idTShirt
        })
    })
    .then(response => {
        if (!response.ok) {
            // Check if it's a duplicate entry
            if (response.status === 400) {
                throw new Error('Item already in wishlist');
            }
            throw new Error('Failed to add to wishlist');
        }
        return response.json();
    })
    .then(() => {
        showNotification('Added to wishlist successfully!', 'success');
        // Optionally change button state
        const wishlistBtn = document.getElementById('wishlist-btn');
        wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> Added to Wishlist';
        wishlistBtn.disabled = true;
    })
    .catch(error => {
        console.error('Wishlist error:', error);
        showNotification(error.message, 'error');
    });
}

// Initiate chat with seller
function initiateChatWithSeller() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showNotification('Please log in to contact seller', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Ensure we have listing data
    if (!listingData) {
        showNotification('Unable to contact seller', 'error');
        return;
    }

    // First create the chat
    fetch('http://localhost:3000/chat/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            senderId: userId,
            receiverId: listingData.userId,
            tshirtId: listingData.idTShirt
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Chat creation response:', data);
        
        // Redirect to chat page with seller information
        window.location.href = `chat.html?sellerId=${listingData.userId}&tshirtId=${listingData.idTShirt}`;
    })
    .catch(error => {
        console.error('Error creating chat:', error);
        showNotification('Failed to start chat with seller', 'error');
    });
}

// Show notification
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

// Show error page
function showErrorPage(message) {
    const mainContainer = document.querySelector('main');
    mainContainer.innerHTML = `
        <div class="error-page">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Oops! Something went wrong</h2>
            <p>${message}</p>
            <a href="listings.html" class="primary-button">
                <i class="fas fa-arrow-left"></i> Back to Listings
            </a>
        </div>
    `;
}
