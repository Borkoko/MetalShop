// Global variables
let allListings = [];
let filteredListings = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 12;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Fetch bands and populate band filter
    fetchBands();
    
    // Fetch initial listings
    fetchListings();
    
    // Set up event listeners
    setupFilterEventListeners();
    setupPaginationListeners();
    setupSortListener();
    setupMobileFilterListeners();
});

// Fetch bands for filter
function fetchBands() {
    fetch('http://localhost:3000/bands')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch bands');
            return response.json();
        })
        .then(bands => {
            const bandFilter = document.getElementById('band-filter');
            bandFilter.innerHTML = bands.map(band => `
                <label>
                    <input type="checkbox" name="band" value="${band.idBand}"> 
                    ${band.name}
                </label>
            `).join('');

            // Add event listeners to band checkboxes
            bandFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', applyFilters);
            });
        })
        .catch(error => {
            console.error('Error fetching bands:', error);
        });
}

// Fetch listings with optional filters
function fetchListings(filters = {}) {
    const container = document.getElementById('listings-container');
    container.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading listings...</span>
        </div>
    `;

    // Construct query string from filters
    const queryParams = new URLSearchParams();
    
    // Add band filters
    if (filters.bands && filters.bands.length) {
        filters.bands.forEach(bandId => queryParams.append('bandId', bandId));
    }
    
    // Add size filters
    if (filters.sizes && filters.sizes.length) {
        filters.sizes.forEach(size => queryParams.append('size', size));
    }
    
    // Add condition filters
    if (filters.conditions && filters.conditions.length) {
        filters.conditions.forEach(condition => queryParams.append('condition', condition));
    }
    
    // Add gender filters
    if (filters.genders && filters.genders.length) {
        filters.genders.forEach(gender => queryParams.append('gender', gender));
    }
    
    // Add price filters
    if (filters.minPrice) {
        queryParams.append('minPrice', filters.minPrice);
    }
    if (filters.maxPrice) {
        queryParams.append('maxPrice', filters.maxPrice);
    }

    // Fetch listings
    fetch(`http://localhost:3000/listings?${queryParams.toString()}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch listings');
            return response.json();
        })
        .then(listings => {
            allListings = listings;
            filteredListings = [...allListings];
            
            // Update result count
            updateResultCount();
            
            // Apply sorting
            sortListings();
            
            // Render first page
            currentPage = 1;
            renderListings();
        })
        .catch(error => {
            console.error('Error fetching listings:', error);
            const container = document.getElementById('listings-container');
            container.innerHTML = `
                <p class="error-message">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Failed to load listings. Please try again later.
                </p>
            `;
        });
}

// Set up filter event listeners
function setupFilterEventListeners() {
    // Size checkboxes
    document.querySelectorAll('input[name="size"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Condition checkboxes
    document.querySelectorAll('input[name="condition"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Gender checkboxes
    document.querySelectorAll('input[name="gender"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Price range inputs
    const minPrice = document.getElementById('min-price');
    const maxPrice = document.getElementById('max-price');
    
    minPrice.addEventListener('change', applyFilters);
    maxPrice.addEventListener('change', applyFilters);

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', resetFilters);
}

// Apply all selected filters
function applyFilters() {
    // Collect selected bands
    const selectedBands = Array.from(
        document.querySelectorAll('input[name="band"]:checked')
    ).map(checkbox => checkbox.value);

    // Collect selected sizes
    const selectedSizes = Array.from(
        document.querySelectorAll('input[name="size"]:checked')
    ).map(checkbox => checkbox.value);

    // Collect selected conditions
    const selectedConditions = Array.from(
        document.querySelectorAll('input[name="condition"]:checked')
    ).map(checkbox => checkbox.value);

    // Collect selected genders
    const selectedGenders = Array.from(
        document.querySelectorAll('input[name="gender"]:checked')
    ).map(checkbox => checkbox.value);

    // Get price range
    const minPrice = document.getElementById('min-price').value;
    const maxPrice = document.getElementById('max-price').value;

    // Filter listings
    filteredListings = allListings.filter(listing => {
        // Band filter
        const bandMatch = selectedBands.length === 0 || 
            selectedBands.includes(listing.bandId.toString());

        // Size filter
        const sizeMatch = selectedSizes.length === 0 || 
            selectedSizes.includes(listing.size);

        // Condition filter
        const conditionMatch = selectedConditions.length === 0 || 
            selectedConditions.includes(listing.item_condition);

        // Gender filter
        const genderMatch = selectedGenders.length === 0 || 
            selectedGenders.includes(listing.gender);

        // Price filter
        const priceMatch = 
            (!minPrice || parseFloat(listing.price) >= parseFloat(minPrice)) &&
            (!maxPrice || parseFloat(listing.price) <= parseFloat(maxPrice));

        return bandMatch && sizeMatch && conditionMatch && genderMatch && priceMatch;
    });

    // Update result count and re-render
    updateResultCount();
    currentPage = 1;
    sortListings();
}

// Reset all filters
function resetFilters() {
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Clear price inputs
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';

    // Reset to original listings
    filteredListings = [...allListings];
    
    // Update UI
    updateResultCount();
    currentPage = 1;
    sortListings();
}

// Update result count display
function updateResultCount() {
    const resultCountText = document.getElementById('result-count-text');
    resultCountText.textContent = `${filteredListings.length} listing${filteredListings.length !== 1 ? 's' : ''}`;
}

// Setup pagination listeners
function setupPaginationListeners() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderListings();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderListings();
        }
    });
}

// Sort listings
function setupSortListener() {
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', sortListings);
}

function sortListings() {
    const sortOption = document.getElementById('sort-select').value;

    switch(sortOption) {
        case 'newest':
            filteredListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'price-low':
            filteredListings.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-high':
            filteredListings.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
    }

    // Re-render listings
    renderListings();
}

// Render listings for current page
function renderListings() {
    const container = document.getElementById('listings-container');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    // Calculate pagination
    const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageListings = filteredListings.slice(startIndex, endIndex);

    // Update page info and buttons
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Render listings
    if (pageListings.length === 0) {
        container.innerHTML = `
            <div class="no-listings">
                <i class="fas fa-box-open"></i>
                <p>No listings match your current filters.</p>
            </div>
        `;
    } else {
        container.innerHTML = pageListings.map(listing => `
            <div class="listing-card" onclick="window.location.href='listing.html?id=${listing.idTShirt}'">
                <div class="listing-image">
                    <img src="${ensureAbsoluteUrl(listing.imageUrl)}" 
                         alt="${listing.bandName} merchandise"
                         onerror="this.onerror=null; this.src='http://localhost:3000/placeholder.jpg';">
                </div>
                <div class="listing-details">
                    <h3 class="listing-band">${listing.bandName}</h3>
                    <div class="listing-meta">
                        <span class="listing-size">${listing.size}</span>
                        <span class="listing-gender">${listing.gender}</span>
                        <span class="listing-condition">${listing.item_condition}</span>
                    </div>
                    <div class="listing-price">$${parseFloat(listing.price).toFixed(2)}</div>
                </div>
            </div>
        `).join('');
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

// Mobile filter toggle
function setupMobileFilterListeners() {
    // Check if mobile filter toggle is needed
    if (window.innerWidth <= 1200) {
        // Create mobile filter toggle
        const filterToggle = document.createElement('div');
        filterToggle.className = 'mobile-filter-toggle';
        filterToggle.innerHTML = `
            <h3>Filter Listings</h3>
            <button id="mobile-filter-btn">
                <i class="fas fa-filter"></i> Filters
            </button>
        `;
        
        // Insert before listings container
        const listingsContainer = document.querySelector('.listings-container');
        listingsContainer.parentNode.insertBefore(filterToggle, listingsContainer);

        // Create mobile filters overlay
        const mobileFiltersOverlay = document.createElement('div');
        mobileFiltersOverlay.className = 'mobile-filters-overlay';
        mobileFiltersOverlay.innerHTML = `
            <div class="mobile-filters-container">
                <div class="mobile-filters-header">
                    <h3><i class="fas fa-filter"></i> Filters</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div id="mobile-filters-content">
                    <!-- Will be populated with existing filter content -->
                </div>
                <div class="mobile-filter-actions">
                    <button id="apply-mobile-filters" class="primary-button">Apply Filters</button>
                    <button id="reset-mobile-filters" class="secondary-button">Reset</button>
                </div>
            </div>
        `;
        document.body.appendChild(mobileFiltersOverlay);

        // Move filters to mobile overlay
        const desktopFilters = document.querySelector('.filters-section');
        const mobileFiltersContent = document.getElementById('mobile-filters-content');
        mobileFiltersContent.innerHTML = desktopFilters.innerHTML;

        // Add event listeners
        document.getElementById('mobile-filter-btn').addEventListener('click', () => {
            mobileFiltersOverlay.style.display = 'block';
        });

        mobileFiltersOverlay.querySelector('.close-btn').addEventListener('click', () => {
            mobileFiltersOverlay.style.display = 'none';
        });

        document.getElementById('apply-mobile-filters').addEventListener('click', () => {
            applyFilters();
            mobileFiltersOverlay.style.display = 'none';
        });

        document.getElementById('reset-mobile-filters').addEventListener('click', () => {
            resetFilters();
            mobileFiltersOverlay.style.display = 'none';
        });

        // Re-add event listeners to mobile filters
        mobileFiltersContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {});
        });
    }
}

// Update mobile filters on window resize
window.addEventListener('resize', setupMobileFilterListeners);
