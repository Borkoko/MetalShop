document.addEventListener("DOMContentLoaded", function() {
    console.log("Login page loaded");
    
    // Check if user is already logged in
    if (localStorage.getItem("isLoggedIn") === "true") {
        // Redirect to main page or original destination
        const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "mainpage.html";
        window.location.href = redirectUrl;
        return;
    }
    
    // Add form submission handler
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
        console.log("Login form found and event listener attached");
    } else {
        console.error("Login form not found");
    }
});

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    console.log("Login form submitted");
    
    // Get form elements
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    // Check if elements exist
    if (!emailInput || !passwordInput) {
        console.error("Email or password input not found");
        alert("Form error: Email or password field is missing");
        return;
    }
    
    // Get form data
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Create or find message container
    let messageContainer = document.getElementById("message-container");
    
    if (!messageContainer) {
        messageContainer = document.createElement("div");
        messageContainer.id = "message-container";
        messageContainer.style.margin = "10px 0";
        messageContainer.style.padding = "10px";
        messageContainer.style.borderRadius = "4px";
        messageContainer.style.textAlign = "center";
        messageContainer.style.display = "none";
        
        // Insert after the form
        const form = document.getElementById("loginForm");
        if (form) {
            form.after(messageContainer);
        } else {
            // Fallback: insert at the end of body
            document.body.appendChild(messageContainer);
        }
    }
    
    // Basic validation
    if (!email || !password) {
        showMessage(messageContainer, "Please enter both email and password", "error");
        return;
    }
    
    // Update button to loading state
    const loginButton = document.querySelector("button[type='submit']");
    if (!loginButton) {
        console.error("Submit button not found");
        alert("Form error: Submit button not found");
        return;
    }
    
    const originalText = loginButton.textContent;
    loginButton.textContent = "Logging in...";
    loginButton.disabled = true;
    
    try {
        console.log("Sending login request to server");
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log("Login successful");
            
            // Store user data in localStorage
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("userName", data.userName);
            localStorage.setItem("userEmail", email);
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("loginTime", Date.now().toString());
            
            // Show success message
            showMessage(messageContainer, "Login successful! Redirecting...", "success");
            
            // Redirect to original destination or main page
            const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "mainpage.html";
            sessionStorage.removeItem("redirectAfterLogin"); // Clear stored redirect
            
            // Redirect after a short delay to show the success message
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        } else {
            // Show error message
            showMessage(messageContainer, data.error || "Login failed", "error");
            
            // Reset button
            loginButton.textContent = originalText;
            loginButton.disabled = false;
        }
    } catch (error) {
        console.error("Login error:", error);
        showMessage(messageContainer, "Connection error. Please try again.", "error");
        
        // Reset button
        loginButton.textContent = originalText;
        loginButton.disabled = false;
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