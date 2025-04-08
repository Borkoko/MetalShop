// Global variables
let listingId = null;
let userId = null;
let originalImages = []; // To keep track of existing images
let removedImageIds = []; // To keep track of images to be removed
let imageFiles = []; // For image URLs
let rawImageFiles = []; // For new file uploads
let currentIndex = 0;

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
    console.log("Edit page loaded");
    
    // Check authentication
    userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.href = "login.html";
        return;
    }
    
    // Get listing ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    listingId = urlParams.get('id');
    
    console.log("Edit page initialized with listing ID:", listingId);
    
    if (!listingId) {
        showNotification("No listing ID provided", "error");
        window.location.href = "profile.html";
        return;
    }
    
    // Store listing ID in form
    document.getElementById("listingId").value = listingId;
    
    // Initialize UI components
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Fetch bands for dropdown
    fetchBands();
    
    // Fetch listing data
    fetchListingData(listingId);
    
    // Update navigation
    updateNavigation();
});

// Initialize UI components
function initializeUI() {
    // Hide navigation buttons initially
    updateImageNavigation();
    
    // Update image counter
    updateImageCounter();
    
    // Set up form message area
    const formMessage = document.getElementById("form-message");
    if (formMessage) {
        formMessage.style.display = "none";
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Image upload
    const imageUpload = document.getElementById("imageUpload");
    if (imageUpload) {
        imageUpload.addEventListener("change", handleImageUpload);
    }
    
    // Form submission
    const form = document.getElementById("edit-listing-form");
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
    
    // Preview updates
    setupPreviewUpdates();
    
    // Character counter for description
    const descriptionElement = document.getElementById("description");
    if (descriptionElement) {
        descriptionElement.addEventListener("input", updateCharCount);
    }
}

// Fetch listing data from server
function fetchListingData(listingId) {
    console.log("Fetching data from:", `http://localhost:3000/listings/${listingId}`);
    
    fetch(`http://localhost:3000/listings/${listingId}`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch listing data");
            return response.json();
        })
        .then(data => {
            console.log("Server response:", data);
            
            // Check if the user is the owner of this listing
            if (data.userId != userId) {
                showNotification("You don't have permission to edit this listing", "error");
                window.location.href = "profile.html";
                return;
            }
            
            // Populate form with existing data
            populateForm(data);
            
            // Load existing images
            loadExistingImages(data.images || []);
        })
        .catch(error => {
            console.error("Error fetching listing data:", error);
            showNotification("Failed to load listing data", "error");
        });
}

// Populate form with existing listing data
function populateForm(data) {
    console.log("Populating form with data:", data);
    
    // Set band
    const bandSelect = document.getElementById("bandSelect");
    if (bandSelect) {
        // We'll select the correct option after bands are loaded
        bandSelect.dataset.selectedBand = data.bandId;
    }
    
    // Set condition
    const conditionSelect = document.getElementById("condition");
    if (conditionSelect && data.item_condition) {
        for (let i = 0; i < conditionSelect.options.length; i++) {
            if (conditionSelect.options[i].value === data.item_condition) {
                conditionSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Set gender
    const genderSelect = document.getElementById("gender");
    if (genderSelect && data.gender) {
        for (let i = 0; i < genderSelect.options.length; i++) {
            if (genderSelect.options[i].value === data.gender) {
                genderSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Set size
    const sizeSelect = document.getElementById("size");
    if (sizeSelect && data.size) {
        for (let i = 0; i < sizeSelect.options.length; i++) {
            if (sizeSelect.options[i].value === data.size) {
                sizeSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Set price
    const priceInput = document.getElementById("price");
    if (priceInput && data.price) {
        priceInput.value = parseFloat(data.price).toFixed(2);
    }
    
    // Set description
    const descriptionInput = document.getElementById("description");
    if (descriptionInput && data.description) {
        descriptionInput.value = data.description;
        updateCharCount();
    }
    
    // Update preview
    updatePreview();
}

// Load existing images
function loadExistingImages(images) {
    if (!images || images.length === 0) {
        console.log("No existing images found");
        return;
    }
    
    console.log("Loading existing images:", images);
    
    // Clear any existing images
    imageFiles = [];
    originalImages = [...images]; // Store original images
    
    // Simply store the image URLs (simpler approach)
    imageFiles = images.map(url => ensureAbsoluteUrl(url));
    
    console.log("Processed image URLs:", imageFiles);
    
    // Display the first image and update UI
    if (imageFiles.length > 0) {
        displayImage(0);
        updateImageCounter();
        updateImageNavigation();
        updateUploadInfo();
        console.log("Images loaded successfully");
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

// Handle image upload
function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    // Check if adding these files would exceed the limit
    if (imageFiles.length + files.length > 5) {
        showNotification("Maximum 5 images allowed", "error");
        return;
    }
    
    // Store the raw files for form submission
    rawImageFiles = [...rawImageFiles, ...files];
    
    // Process each file for preview
    files.forEach(file => {
        if (!file.type.startsWith("image/")) {
            showNotification("Only image files are allowed", "error");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imageFiles.push(e.target.result);
            
            // If this is the first image, display it
            if (imageFiles.length === 1) {
                displayImage(0);
            }
            
            // Update image counter and navigation
            updateImageCounter();
            updateImageNavigation();
            updateUploadInfo();
        };
        reader.readAsDataURL(file);
    });
}

// Display the current image
function displayImage(index) {
    const previewContainer = document.getElementById("imagePreview");
    if (!previewContainer) return;
    
    previewContainer.innerHTML = "";
    
    if (imageFiles.length > 0) {
        const img = document.createElement("img");
        img.src = imageFiles[index];
        img.alt = "Preview image";
        previewContainer.appendChild(img);
    } else {
        // Show the upload prompt if no images
        previewContainer.innerHTML = `
            <div class="upload-prompt">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Upload images</p>
            </div>
        `;
    }
}

// Change to the next/previous image
function changeImage(direction) {
    if (imageFiles.length === 0) return;
    
    currentIndex += direction;
    
    // Loop around if at the ends
    if (currentIndex < 0) currentIndex = imageFiles.length - 1;
    if (currentIndex >= imageFiles.length) currentIndex = 0;
    
    displayImage(currentIndex);
    updateImageCounter();
}

// Delete the current image
function deleteCurrentImage() {
    if (imageFiles.length === 0) return;
    
    // Check if this is an original image
    if (currentIndex < originalImages.length) {
        // Mark the original image for deletion
        removedImageIds.push(currentIndex);
    }
    
    // Remove from the arrays
    imageFiles.splice(currentIndex, 1);
    if (currentIndex < originalImages.length) {
        originalImages.splice(currentIndex, 1);
    } else {
        // Adjust index for raw files (for new uploads only)
        const rawIndex = currentIndex - originalImages.length;
        if (rawIndex >= 0 && rawIndex < rawImageFiles.length) {
            rawImageFiles.splice(rawIndex, 1);
        }
    }
    
    // Adjust current index if needed
    if (currentIndex >= imageFiles.length) {
        currentIndex = Math.max(0, imageFiles.length - 1);
    }
    
    // Update the display
    if (imageFiles.length === 0) {
        displayImage(0); // Shows the upload prompt
    } else {
        displayImage(currentIndex);
    }
    
    // Update UI elements
    updateImageCounter();
    updateImageNavigation();
    updateUploadInfo();
}

// Update the image counter text
function updateImageCounter() {
    const currentElement = document.getElementById("current-image");
    const totalElement = document.getElementById("total-images");
    
    if (!currentElement || !totalElement) return;
    
    if (imageFiles.length === 0) {
        currentElement.textContent = "0";
        totalElement.textContent = "0";
    } else {
        currentElement.textContent = (currentIndex + 1).toString();
        totalElement.textContent = imageFiles.length.toString();
    }
}

// Update the visibility of image navigation buttons
function updateImageNavigation() {
    const prevButton = document.getElementById("prevImage");
    const nextButton = document.getElementById("nextImage");
    const deleteButton = document.getElementById("deleteImage");
    const counter = document.querySelector(".image-counter");
    
    if (!prevButton || !nextButton || !deleteButton || !counter) return;
    
    if (imageFiles.length <= 1) {
        prevButton.style.display = "none";
        nextButton.style.display = "none";
    } else {
        prevButton.style.display = "flex";
        nextButton.style.display = "flex";
    }
    
    if (imageFiles.length === 0) {
        deleteButton.style.display = "none";
        counter.style.display = "none";
    } else {
        deleteButton.style.display = "flex";
        counter.style.display = "block";
    }
}

// Update the upload info text
function updateUploadInfo() {
    const uploadInfo = document.getElementById("upload-info");
    if (!uploadInfo) return;
    
    const originalCount = originalImages.length - removedImageIds.length;
    const newCount = rawImageFiles.length;
    const totalCount = originalCount + newCount;
    
    if (totalCount > 0) {
        uploadInfo.textContent = `${totalCount} image${totalCount > 1 ? 's' : ''} (${originalCount} existing, ${newCount} new)`;
        uploadInfo.classList.add("files-selected");
    } else {
        uploadInfo.textContent = "No images selected";
        uploadInfo.classList.remove("files-selected");
    }
}

// Set up preview updates
function setupPreviewUpdates() {
    // Band dropdown
    const bandSelect = document.getElementById("bandSelect");
    if (bandSelect) {
        bandSelect.addEventListener("change", updatePreview);
    }
    
    // Condition dropdown
    const condition = document.getElementById("condition");
    if (condition) {
        condition.addEventListener("change", updatePreview);
    }
    
    // Gender dropdown
    const gender = document.getElementById("gender");
    if (gender) {
        gender.addEventListener("change", updatePreview);
    }
    
    // Size dropdown
    const size = document.getElementById("size");
    if (size) {
        size.addEventListener("change", updatePreview);
    }
    
    // Price input
    const price = document.getElementById("price");
    if (price) {
        price.addEventListener("input", validatePriceInput);
    }
    
    // Description textarea
    const description = document.getElementById("description");
    if (description) {
        description.addEventListener("input", updatePreview);
    }
}

// Update character count for description
function updateCharCount() {
    const description = document.getElementById("description");
    const charCount = document.getElementById("char-count");
    
    if (!description || !charCount) return;
    
    const currentLength = description.value.length;
    charCount.textContent = currentLength;
    
    if (currentLength > 500) {
        description.value = description.value.substring(0, 500);
        charCount.textContent = "500";
    }
}

// Validate price input
function validatePriceInput(event) {
    const input = event.target;
    let value = input.value;
    
    // Allow only numbers and one decimal point
    value = value.replace(/[^0-9.]/g, "");
    value = value.replace(/^0+(\d)/, "$1");
    value = value.replace(/(\..*)\./g, "$1");
    
    // Limit to 10 digits before decimal and 2 after
    const match = value.match(/^(\d{0,10})(\.\d{0,2})?/);
    if (match) {
        value = match[1] + (match[2] || "");
    }
    
    // Update the input value
    input.value = value;
    
    // Update preview
    const previewPrice = document.getElementById("preview-price");
    if (previewPrice) {
        previewPrice.textContent = value || "0.00";
    }
}

// Update the preview based on form selections
function updatePreview() {
    // Band
    const bandSelect = document.getElementById("bandSelect");
    const previewBand = document.getElementById("preview-band");
    if (bandSelect && previewBand) {
        previewBand.textContent = bandSelect.options[bandSelect.selectedIndex]?.text || "Select a band";
    }
    
    // Condition
    const condition = document.getElementById("condition");
    const previewCondition = document.getElementById("preview-condition");
    if (condition && previewCondition) {
        previewCondition.textContent = condition.value || "Select condition";
    }
    
    // Gender
    const gender = document.getElementById("gender");
    const previewGender = document.getElementById("preview-gender");
    if (gender && previewGender) {
        previewGender.textContent = gender.value || "Select gender";
    }
    
    // Size
    const size = document.getElementById("size");
    const previewSize = document.getElementById("preview-size");
    if (size && previewSize) {
        previewSize.textContent = size.value || "Select size";
    }
    
    // Description
    const description = document.getElementById("description");
    const previewDescription = document.getElementById("preview-description");
    if (description && previewDescription) {
        previewDescription.textContent = description.value || "Add a description...";
    }
    
    // Price is updated in validatePriceInput
}

// Fetch bands for dropdown
function fetchBands() {
    fetch("http://localhost:3000/bands")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch bands");
            }
            return response.json();
        })
        .then(bands => {
            const bandSelect = document.getElementById("bandSelect");
            if (!bandSelect) return;
            
            // Clear existing options except the first
            while (bandSelect.options.length > 1) {
                bandSelect.remove(1);
            }
            
            // Add band options
            bands.forEach(band => {
                const option = document.createElement("option");
                option.value = band.idBand;
                option.textContent = band.name;
                bandSelect.appendChild(option);
            });
            
            // Set the selected band if we have one
            if (bandSelect.dataset.selectedBand) {
                bandSelect.value = bandSelect.dataset.selectedBand;
                updatePreview();
            }
        })
        .catch(error => {
            console.error("Error fetching bands:", error);
            showNotification("Failed to load bands", "error");
        });
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    console.log("Form submission started");
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Create form data for submission
    const formData = new FormData();
    
    // Add form fields
    formData.append("listingId", listingId);
    formData.append("userId", userId);
    formData.append("bandId", document.getElementById("bandSelect").value);
    formData.append("size", document.getElementById("size").value);
    formData.append("condition", document.getElementById("condition").value);
    formData.append("price", document.getElementById("price").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("gender", document.getElementById("gender").value);
    
    // Add information about removed images
    formData.append("removedImageIds", JSON.stringify(removedImageIds));
    
    // Add new images
    console.log(`Adding ${rawImageFiles.length} new image(s) to form data`);
    for (let i = 0; i < rawImageFiles.length; i++) {
        const file = rawImageFiles[i];
        console.log(`Adding image ${i+1}:`, file.name, file.type, file.size);
        formData.append("images", file);
    }
    
    // Log form data (for debugging)
    for (let pair of formData.entries()) {
        console.log(pair[0], pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]);
    }
    
    // Update button to loading state
    const submitBtn = document.querySelector(".submit-btn");
    if (!submitBtn) {
        console.error("Submit button not found");
        return;
    }
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    submitBtn.disabled = true;
    
    try {
        console.log("Submitting to server at http://localhost:3000/listings/update");
        
        const response = await fetch(`http://localhost:3000/listings/${listingId}`, {
            method: "PUT",
            body: formData,
            // Important: Don't set Content-Type header, the browser will set it with the boundary
        });
        
        console.log("Server response status:", response.status);
        
        // Handle non-OK response
        if (!response.ok) {
            // Try to get error details from response
            let errorMessage = "Failed to update listing";
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // Ignore JSON parsing error
            }
            
            throw new Error(errorMessage);
        }
        
        // Parse response
        const data = await response.json();
        console.log("Response data:", data);
        
        // Show success message
        showNotification("Listing updated successfully!", "success");
        
        // Redirect to the listing page
        setTimeout(() => {
            window.location.href = `listing.html?id=${listingId}`;
        }, 1500);
    } catch (error) {
        console.error("Error updating listing:", error);
        
        // Show error in form and notification
        showFormMessage(error.message, "error");
        showNotification(error.message, "error");
        
        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Validate form before submission
function validateForm() {
    // Get form values
    const bandId = document.getElementById("bandSelect").value;
    const size = document.getElementById("size").value;
    const condition = document.getElementById("condition").value;
    const gender = document.getElementById("gender").value;
    const price = document.getElementById("price").value;
    const description = document.getElementById("description").value;
    
    // Check all required fields
    if (!bandId || !size || !condition || !gender || !price || !description) {
        showFormMessage("Please fill in all required fields", "error");
        return false;
    }
    
    // Check if any images are present (either original or new)
    if (imageFiles.length === 0) {
        showFormMessage("Please upload at least one image", "error");
        return false;
    }
    
    // All checks passed
    return true;
}

// Update navigation if user is logged in
function updateNavigation() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    
    // Get user data
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch user data");
            return response.json();
        })
        .then(userData => {
            // Update login button to show user name
            const loginButton = document.querySelector("a[href='login.html']");
            if (loginButton) {
                loginButton.innerHTML = `<i class="fas fa-user"></i> ${userData.firstName}`;
                loginButton.href = "profile.html";
            }
        })
        .catch(error => {
            console.error("Error fetching user data:", error);
        });
}

// Show message in the form
function showFormMessage(message, type) {
    const messageElement = document.getElementById("form-message");
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.style.display = "block";
    
    // Reset classes
    messageElement.className = "form-message";
    
    // Add type class
    if (type) {
        messageElement.classList.add(type);
    }
    
    // Scroll to the message
    messageElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Show notification
function showNotification(message, type) {
    const notification = document.getElementById("notification");
    if (!notification) return;
    
    const messageElement = notification.querySelector(".notification-message");
    if (!messageElement) return;
    
    // Set message
    messageElement.textContent = message;
    
    // Reset classes and add new ones
    notification.className = "notification";
    notification.classList.add(type || "info");
    notification.classList.add("visible");
    
    // Hide after a delay
    setTimeout(() => {
        notification.classList.remove("visible");
    }, 3000);
}

// Handle cancel button click
function cancelEdit() {
    // Confirm before canceling if changes were made
    const confirmCancel = confirm("Are you sure you want to cancel? Any changes you've made will be lost.");
    
    if (confirmCancel) {
        // Redirect back to listing page or profile
        window.location.href = `listing.html?id=${listingId}`;
    }
}