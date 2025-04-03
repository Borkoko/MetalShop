// Common authentication and navigation functions
document.addEventListener("DOMContentLoaded", function() {
    // Check authentication and update navigation
    checkAuth();
});

// Check authentication status and update UI accordingly
function checkAuth() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    const loginTime = localStorage.getItem("loginTime");
    
    // Check if session has expired (24 hours)
    if (isLoggedIn && loginTime) {
        const currentTime = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (currentTime - parseInt(loginTime) > sessionDuration) {
            // Session expired, log out
            logout();
            return;
        }
    }
    
    // Update navigation based on auth status
    updateNavigation(isLoggedIn, userName);
    
    // If this is a protected page and user is not logged in, redirect to login
    const requiresAuth = document.body.hasAttribute("data-requires-auth");
    if (requiresAuth && !isLoggedIn) {
        // Store current page URL to redirect back after login
        sessionStorage.setItem("redirectAfterLogin", window.location.href);
        window.location.href = "login.html";
    }
    
    // If user is logged in, fetch latest user data in the background
    if (isLoggedIn && userId) {
        refreshUserData(userId);
    }
    
    // Check if user is admin
    if (isLoggedIn && userId) {
        checkIfAdmin(userId);
    }
}

// Update navigation elements based on authentication status
function updateNavigation(isLoggedIn, userName) {
    // Find login/user button in navigation
    const loginButton = document.querySelector('a[href="login.html"]');
    
    if (loginButton && isLoggedIn && userName) {
        // Update button text and link to profile
        loginButton.innerHTML = `<i class="fas fa-user"></i> ${userName}`;
        loginButton.href = "profile.html";
        
        // Add logout option
        const logoutLink = document.createElement("a");
        logoutLink.href = "#";
        logoutLink.className = "nav-button";
        logoutLink.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout`;
        logoutLink.addEventListener("click", function(e) {
            e.preventDefault();
            logout();
        });
        
        // Add logout link after the login button
        if (loginButton.parentNode) {
            loginButton.parentNode.insertBefore(logoutLink, loginButton.nextSibling);
        }
    }
}

// Check if user is an admin
function checkIfAdmin(userId) {
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch user data");
            return response.json();
        })
        .then(userData => {
            console.log("Checking admin status for user:", userData);
            if (userData.isAdmin) {
                console.log("User is admin, updating UI");
                // Store admin status in localStorage
                localStorage.setItem('isAdmin', 'true');
                
                // Add admin link to navigation if not already there
                const nav = document.querySelector('nav');
                if (nav && !document.querySelector('.admin-link')) {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.className = 'nav-button admin-link';
                    adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
                    
                    // Style the admin button differently
                    adminLink.style.backgroundColor = '#ff0000';
                    adminLink.style.color = 'white';
                    
                    // Add the link to navigation
                    nav.appendChild(adminLink);
                    console.log("Admin link added to navigation");
                }
                
                // If on admin.html, verify access (prevents URL navigation to admin page by non-admins)
                if (window.location.pathname.includes('admin.html')) {
                    console.log('Admin access verified');
                }
            } else {
                console.log("User is not admin");
                // Remove admin status if set
                localStorage.removeItem('isAdmin');
                
                // If on admin page but not admin, redirect to home
                if (window.location.pathname.includes('admin.html')) {
                    alert('You do not have admin privileges');
                    window.location.href = 'mainpage.html';
                }
            }
        })
        .catch(error => {
            console.error("Error checking admin status:", error);
        });
    }

// Refresh user data from the server
function refreshUserData(userId) {
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch user data");
            return response.json();
        })
        .then(userData => {
            // Update localStorage with fresh user data
            localStorage.setItem("userName", userData.firstName);
            localStorage.setItem("userEmail", userData.email);
            
            // Update navigation if needed
            const loginButton = document.querySelector('a[href="profile.html"]');
            if (loginButton) {
                loginButton.innerHTML = `<i class="fas fa-user"></i> ${userData.firstName}`;
            }
        })
        .catch(error => {
            console.error("Error refreshing user data:", error);
            // If server returns 401 or 404, user may have been deleted or session invalid
            if (error.message.includes("401") || error.message.includes("404")) {
                logout();
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
    localStorage.removeItem("isAdmin");
    
    // Call logout endpoint (optional)
    fetch("http://localhost:3000/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }).catch(err => console.error("Error logging out:", err));
    
    // Redirect to login page
    window.location.href = "login.html";
}