document.addEventListener("DOMContentLoaded", function() {
    // Check if already logged in
    if (localStorage.getItem("isLoggedIn") === "true") {
        window.location.href = "mainpage.html";
        return;
    }
    
    // Set up form submission handler
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", handleRegistration);
        console.log("Registration form found and event listener attached");
    } else {
        console.error("Registration form not found");
    }
});

// Handle form submission
async function handleRegistration(event) {
    event.preventDefault();
    console.log("Form submission handler triggered");
    
    // Get form elements
    const fnameInput = document.getElementById("fname");
    const lnameInput = document.getElementById("lname");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    // Check if all elements exist
    if (!fnameInput || !lnameInput || !emailInput || !passwordInput) {
        console.error("One or more form fields not found");
        alert("Form error: One or more fields are missing");
        return;
    }
    
    // Get form data
    const fname = fnameInput.value.trim();
    const lname = lnameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Create or find message container
    let messageContainer;
    messageContainer = document.getElementById("message-container");
    
    if (!messageContainer) {
        messageContainer = document.createElement("div");
        messageContainer.id = "message-container";
        messageContainer.style.margin = "10px 0";
        messageContainer.style.padding = "10px";
        messageContainer.style.borderRadius = "4px";
        messageContainer.style.display = "none";
        
        // Insert after the form
        const form = document.getElementById("registerForm");
        if (form) {
            form.after(messageContainer);
        } else {
            // Fallback: insert at the end of body
            document.body.appendChild(messageContainer);
        }
    }
    
    // Basic validation
    if (!fname || !lname || !email || !password) {
        showMessage(messageContainer, "All fields are required", "error");
        return;
    }
    
    if (password.length < 6) {
        showMessage(messageContainer, "Password must be at least 6 characters long", "error");
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage(messageContainer, "Please enter a valid email address", "error");
        return;
    }
    
    // Update button to loading state
    const registerButton = document.querySelector("button[type='submit']");
    if (!registerButton) {
        console.error("Submit button not found");
        alert("Form error: Submit button not found");
        return;
    }
    
    const originalText = registerButton.textContent;
    registerButton.textContent = "Registering...";
    registerButton.disabled = true;
    
    try {
        console.log("Sending registration request to server");
        const response = await fetch("http://localhost:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fname, lname, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            showMessage(messageContainer, "Registration successful! Redirecting to login...", "success");
            
            // Redirect to login after short delay
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            // Show error message
            showMessage(messageContainer, data.error || "Registration failed", "error");
            registerButton.textContent = originalText;
            registerButton.disabled = false;
        }
    } catch (error) {
        console.error("Registration error:", error);
        showMessage(messageContainer, "Connection error. Please try again.", "error");
        registerButton.textContent = originalText;
        registerButton.disabled = false;
    }
}

// Display a message to the user
function showMessage(container, message, type) {
    if (!container) {
        console.error("Message container not found");
        alert(message);
        return;
    }
    
    container.textContent = message;
    container.style.display = "block";
    
    // Set color based on message type
    if (type === "error") {
        container.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        container.style.color = "#ff3333";
        container.style.border = "1px solid #ff3333";
    } else if (type === "success") {
        container.style.backgroundColor = "rgba(0, 128, 0, 0.1)";
        container.style.color = "#4BB543";
        container.style.border = "1px solid #4BB543";
    } else {
        container.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
        container.style.color = "#3333ff";
        container.style.border = "1px solid #3333ff";
    }
}