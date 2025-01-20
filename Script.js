document.addEventListener('DOMContentLoaded', function () {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && !headerContainer.innerHTML.trim()) {
        loadHeader(headerContainer);
    }

    animateHeroSection();

    console.log('Website is loaded and ready!');
});

// Function to load the header content
async function loadHeader(container) {
    try {
        const response = await fetch('header.html', {
            method: 'GET',
            headers: { 'Content-Type': 'text/html' },
            credentials: 'include',
        });

        if (!response.ok) throw new Error(`Header file not found. Status: ${response.status}`);

        const data = await response.text();
        container.innerHTML = data;

        console.log('Header content loaded successfully.');

        initDropdown(); // Initialize dropdown functionality
    } catch (error) {
        console.error('Error loading header:', error);
        container.innerHTML = `<p>Failed to load header. Please try again later.</p>`;
    }
}

// Initialize dropdown functionality
function initDropdown() {
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');
    const dropbtn = document.querySelector('.dropbtn');
    let escapeTimer;

    if (!dropdown || !dropdownContent || !dropbtn) {
        console.warn('Dropdown elements not found. Skipping initialization.');
        return;
    }

    // Function to open the dropdown
    function openDropdown() {
        dropdownContent.style.display = 'block';
        clearTimeout(escapeTimer); // Clear any existing timer
        startEscapeTimer(dropdownContent); // Start the escape timer
    }

    // Function to close the dropdown
    function closeDropdown() {
        dropdownContent.style.display = 'none';
        clearTimeout(escapeTimer); // Clear the timer when the dropdown closes
    }

    // Click event to toggle dropdown
    dropbtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (dropdownContent.style.display === 'block') {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    // Hover events to handle dropdown open and escape timer
    dropbtn.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseleave', closeDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            closeDropdown();
        }
    });
}


// Function to start the escape timer
function startEscapeTimer(dropdownContent) {
    const menuItems = dropdownContent.querySelectorAll('a'); // Get all menu items
    const escapeDelay = 5000; // Time in milliseconds before escape starts, 1000ms = 1s

    clearTimeout(escapeTimer); // Prevent multiple timers
    escapeTimer = setTimeout(() => {
        menuItems.forEach(makeItemEscape);
    }, escapeDelay); // Start escape after delay
}

// Function to make menu items escape and bounce around
function makeItemEscape(item) {
    item.style.position = 'absolute'; // Set position to absolute
    item.style.transition = 'transform 0.6s ease, top 0.6s ease, left 0.6s ease';

    function moveItem() {
        const randomX = Math.random() * (window.innerWidth - item.offsetWidth); 
        const randomY = Math.random() * (window.innerHeight - item.offsetHeight);
        item.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }

    moveItem();
    clearInterval(item.escapeInterval); // Prevent multiple intervals
    item.escapeInterval = setInterval(moveItem, 2000); // Move item every 2 seconds
}

// Function to animate hero section
function animateHeroSection() {
    const heroImage = document.querySelector('.hero-image');
    const heroText = document.querySelector('.hero-text');

    if (!heroImage || !heroText) return;

    heroImage.style.opacity = 0;
    heroImage.style.transform = 'translateY(-50px)';
    heroText.style.opacity = 0;

    setTimeout(() => {
        heroImage.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        heroImage.style.opacity = 1;
        heroImage.style.transform = 'translateY(0)';

        setTimeout(() => {
            heroText.style.transition = 'opacity 0.6s ease';
            heroText.style.opacity = 1;
        }, 1600);
    }, 1200);
}

//* Contact form submission*//
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        const responseElement = document.getElementById('response');

        if (!name || !email || !message) {
            responseElement.textContent = 'All fields are required.';
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            responseElement.textContent = 'Please enter a valid email address.';
            return;
        }

        responseElement.textContent = 'Sending message... Please wait.';

        try {
            const response = await fetch('http://localhost:5000/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message }),
                credentials: 'include',
            });

            const result = await response.json();
            responseElement.textContent = response.ok
                ? result.message || 'Message sent successfully!'
                : result.error || 'An error occurred.';

            if (response.ok) {
                document.getElementById('name').value = '';
                document.getElementById('email').value = '';
                document.getElementById('message').value = '';
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            if (error.message.includes('NetworkError')) {
                responseElement.textContent = 'Network error. Please check your connection.';
            } else {
                responseElement.textContent = 'An error occurred. Please try again later.';
            }
        }
    });
}


