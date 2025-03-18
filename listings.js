document.addEventListener('DOMContentLoaded', function() {
    // Get listing ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    
    if (!listingId) {
        // No listing ID provided, show error
        showError("No listing ID provided");
        return;
    }
    
    // Fetch the listing data
    fetchListing(listingId);
    
    // Set up event listeners for the contact and wishlist buttons
    setupButtonListeners(listingId);
});

// Update main image and active thumbnail
function updateMainImage(images, index) {
    // Update main image
    document.getElementById('main-image').innerHTML = `<img src="${images[index]}" alt="T-shirt image">`;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
    
    // Update image counter
    document.getElementById('current-index').textContent = index + 1;
}

// Display a placeholder when no images are available
function displayPlaceholderImage() {
    document.getElementById('main-image').innerHTML = `
        <div class="no-image-placeholder">
            <i class="fas fa-image"></i>
            <p>No image available</p>
        </div>
    `;
    
    // Hide navigation and counter
    document.getElementById('prev-image').style.display = 'none';
    document.getElementById('next-image').style.display = 'none';
    document.querySelector('.image-counter').style.display = 'none';
}

// Fetch related listings (same band or similar items)
async function fetchRelatedListings(bandId) {
    try {
        // Get listings from the same band
        const response = await fetch(`http://localhost:3000/listings?bandId=${bandId}&limit=4`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const listings = await response.json();
        
        // Get the current listing ID to exclude it from related listings
        const currentListingId = new URLSearchParams(window.location.search).get('id');
        
        // Filter out the current listing
        const relatedListings = listings.filter(listing => listing.idTShirt.toString() !== currentListingId);
        
        // Display related listings
        displayRelatedListings(relatedListings);
    } catch (error) {
        console.error('Error fetching related listings:', error);
        document.getElementById('related-listings').innerHTML = '<p>Failed to load related listings</p>';
    }
}

// Display related listings
function displayRelatedListings(listings) {
    const container = document.getElementById('related-listings');
    
    // Clear loading indicator
    container.innerHTML = '';
    
    if (!listings || listings.length === 0) {
        container.innerHTML = '<p class="no-items">No related listings found</p>';
        return;
    }
    
    // Create listing cards
    listings.forEach(listing => {
        const card = createListingCard(listing);
        container.appendChild(card);
    });
}

// Create a listing card element
function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    
    // Format price
    const formattedPrice = parseFloat(listing.price).toFixed(2);
    
    card.innerHTML = `
        <div class="listing-image">
            <img src="${listing.imageUrl || 'placeholder.jpg'}" alt="${listing.bandName} merchandise">
        </div>
        <div class="card-details">
            <h3 class="card-band">${listing.bandName}</h3>
            <div class="card-meta">
                <span class="card-size">${listing.size}</span>
                <span class="card-gender">${listing.gender}</span>
                <span class="card-condition">${listing.condition}</span>
            </div>
            <div class="card-price">${formattedPrice}</div>
        </div>
    `;
    
    // Make card clickable
    card.addEventListener('click', () => {
        window.location.href = `listing.html?id=${listing.idTShirt}`;
    });
    
    return card;
}

// Set up button listeners
function setupButtonListeners(listingId) {
    // Contact seller button
    document.getElementById('contact-seller').addEventListener('click', function() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn) {
            // Store current page URL to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            showNotification('Please login to contact the seller', 'warning');
            
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // TODO: Implement chat functionality
        showNotification('Chat feature coming soon!', 'info');
    });
    
    // Add to wishlist button
    document.getElementById('add-wishlist').addEventListener('click', function() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn) {
            // Store current page URL to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            showNotification('Please login to add items to your wishlist', 'warning');
            
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        const userId = localStorage.getItem('userId');
        
        // Add to wishlist
        addToWishlist(userId, listingId);
    });
}

// Add item to wishlist
async function addToWishlist(userId, listingId) {
    try {
        const response = await fetch('http://localhost:3000/wishlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                tshirtId: listingId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            showNotification(error.error || 'Failed to add to wishlist', 'error');
            return;
        }
        
        // Success
        showNotification('Added to your wishlist!', 'success');
        
        // Update button
        const wishlistButton = document.getElementById('add-wishlist');
        wishlistButton.innerHTML = '<i class="fas fa-heart"></i> Added to Wishlist';
        wishlistButton.disabled = true;
        
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showNotification('Failed to add to wishlist', 'error');
    }
}

// Show error message
function showError(message) {
    document.getElementById('listing-loading').style.display = 'none';
    const errorElement = document.getElementById('listing-error');
    errorElement.querySelector('span').textContent = message;
    errorElement.style.display = 'flex';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    
    // Set message and type
    messageElement.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 3000);
}

// Fetch listing data from the server
async function fetchListing(listingId) {
    try {
        const response = await fetch(`http://localhost:3000/listings/${listingId}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const listing = await response.json();
        
        // Display the listing data
        displayListing(listing);
        
        // Fetch related listings (same band or similar items)
        fetchRelatedListings(listing.bandId);
    } catch (error) {
        console.error('Error fetching listing:', error);
        showError("Listing not found or has been removed");
    }
}

// Display listing data on the page
function displayListing(listing) {
    // Hide loading indicator and show content
    document.getElementById('listing-loading').style.display = 'none';
    document.getElementById('listing-content').style.display = 'grid';
    
    // Update page title
    document.title = `${listing.bandName} T-Shirt - MetalShop`;
    
    // Update header and basic info
    document.getElementById('band-name').textContent = listing.bandName;
    document.getElementById('price').textContent = `$${parseFloat(listing.price).toFixed(2)}`;
    document.getElementById('size').textContent = listing.size;
    document.getElementById('gender').textContent = listing.gender;
    document.getElementById('condition').textContent = listing.condition;
    document.getElementById('description').textContent = listing.description;
    document.getElementById('seller-name').textContent = `${listing.fname} ${listing.lname.charAt(0)}.`;
    
    // Format and display timestamp
    const listingDate = new Date(listing.createdAt);
    const formattedDate = listingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('timestamp').textContent = `Listed on: ${formattedDate}`;
    
    // Handle images
    setupImages(listing.images || [listing.imageUrl].filter(Boolean));
}

// Set up image gallery
function setupImages(images) {
    if (!images || images.length === 0) {
        // No images available, show placeholder
        displayPlaceholderImage();
        return;
    }
    
    // Update image counter
    document.getElementById('total-images').textContent = images.length;
    
    // Set up main image
    const mainImageContainer = document.getElementById('main-image');
    mainImageContainer.innerHTML = `<img src="${images[0]}" alt="T-shirt image">`;
    
    // Set up thumbnails
    const thumbnailsContainer = document.getElementById('thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    images.forEach((imageUrl, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.innerHTML = `<img src="${imageUrl}" alt="Thumbnail ${index + 1}">`;
        
        // Add click event to switch main image
        thumbnail.addEventListener('click', () => {
            // Update main image
            mainImageContainer.innerHTML = `<img src="${imageUrl}" alt="T-shirt image">`;
            
            // Update active thumbnail
            document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
            thumbnail.classList.add('active');
            
            // Update image counter
            document.getElementById('current-index').textContent = index + 1;
        });
        
        thumbnailsContainer.appendChild(thumbnail);
    });
    
    // Set up navigation buttons
    const prevButton = document.getElementById('prev-image');
    const nextButton = document.getElementById('next-image');
    let currentIndex = 0;
    
    // Hide nav buttons if there's only one image
    if (images.length <= 1) {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
    }
    
    // Previous image button
    prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateMainImage(images, currentIndex);
    });
    
    // Next image button
    nextButton.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateMainImage(images, currentIndex);
    });
}