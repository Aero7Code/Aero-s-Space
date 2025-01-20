document.addEventListener('DOMContentLoaded', function () {
    // Dynamically load the header content only if it's not already loaded
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer.innerHTML.trim()) {
        loadHeader(headerContainer);
    }

    // Trigger content animations for the hero section
    animateHeroSection();

    console.log('Website is loaded and ready!');
});

// Function to load the header content
async function loadHeader(container) {
    try {
        const response = await fetch('header.html', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
            },
            credentials: 'include', // Include credentials for cookies/authentication if required
        });

        if (!response.ok) {
            throw new Error(`Header file not found. Status: ${response.status}`);
        }

        const data = await response.text();
        container.innerHTML = data;
        console.log('Header content loaded:', data); // Debugging

        // Initialize dropdown functionality after header is loaded
        initDropdown();

    } catch (error) {
        console.error('Error loading header:', error); // Debugging
        const errorMessage = error.message.includes('CORS')
            ? 'A CORS error occurred. Please check your backend configuration.'
            : 'Header could not be loaded. Please try again later.';
        container.innerHTML = `<p>${errorMessage}</p>`;
    }
}

// Initialize dropdown functionality
function initDropdown() {
    const dropdown = document.querySelector('.dropdown'); // Dropdown container
    const dropdownContent = document.querySelector('.dropdown-content'); // Dropdown content
    const dropbtn = document.querySelector('.dropbtn'); // Dropdown button
    let escapeTimer;
    let isEscaping = false;

    // Hover event on dropdown button to start the escape timer
    dropbtn.addEventListener('mouseenter', () => {
        if (!isEscaping) {
            isEscaping = true;
            startEscapeTimer(dropdownContent);
        }
    });

    // Clear escape timer on hover out
    dropbtn.addEventListener('mouseleave', () => {
        clearTimeout(escapeTimer);
        isEscaping = false;
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
            clearTimeout(escapeTimer); // Clear escape timer when menu closes
        }
    });

    dropdown.addEventListener('click', (event) => {
        const isDisplayed = dropdownContent.style.display === 'block';
        dropdownContent.style.display = isDisplayed ? 'none' : 'block';
        event.stopPropagation(); // Prevent immediate closing
    });
}

// Function to start the escape timer
function startEscapeTimer(dropdownContent) {
    const menuItems = dropdownContent.querySelectorAll('a'); // Get all menu items
    let timeout = 300; // Time (in ms) before items start escaping

    escapeTimer = setTimeout(() => {
        menuItems.forEach((item) => {
            makeItemEscape(item);
        });
    }, timeout);
}

// Function to make menu items escape and bounce around
function makeItemEscape(item) {
    item.style.position = 'absolute';
    item.style.transition = 'all 0.5s ease';
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    function moveItem() {
        let randomX = Math.random() * (screenWidth - item.offsetWidth);
        let randomY = Math.random() * (screenHeight - item.offsetHeight);
        item.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }

    moveItem(); // Initial move

    setInterval(() => {
        moveItem();
    }, 2000); // Repeat movement every 2 seconds
}

// Function to animate hero section
function animateHeroSection() {
    const heroImage = document.querySelector('.hero-image'); // Image element
    const heroText = document.querySelector('.hero-text'); // Text element

    if (heroImage && heroText) {
        // Initial styles for animation
        heroImage.style.opacity = 0; // Hide image
        heroImage.style.transform = 'translateY(-50px)'; // Move image up
        heroText.style.opacity = 0; // Hide text

        // Trigger image animation
        setTimeout(() => {
            heroImage.style.transition = 'opacity 0.8s ease, transform 0.8s ease'; // Smooth transition
            heroImage.style.opacity = 1; // Show image
            heroImage.style.transform = 'translateY(0)'; // Move image down

            // Trigger text animation after image
            setTimeout(() => {
                heroText.style.transition = 'opacity 0.8s ease'; // Smooth transition
                heroText.style.opacity = 1; // Show text
            }, 1600); // Delay for text fade-in
        }, 1200); // Delay for image drop-in
    }
}

// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    // Simple form validation
    if (!name || !email || !message) {
        document.getElementById('response').textContent = 'All fields are required.';
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer <your-token>', // Optional: Include auth tokens if needed
            },
            body: JSON.stringify({ name, email, message }),
            credentials: 'include', // Include credentials for cookies/authentication if required
        });

        const result = await response.json();

        // Display success or error message
        document.getElementById('response').textContent =
            response.ok ? result.message || 'Message sent successfully!' : result.error || 'An error occurred.';
    } catch (error) {
        console.error('Error submitting form:', error);
        const errorMessage = error.message.includes('CORS')
            ? 'A CORS error occurred. Please check your backend configuration.'
            : 'An error occurred. Please try again later.';
        document.getElementById('response').textContent = errorMessage;
    }
});
