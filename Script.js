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

    if (!dropdown || !dropdownContent || !dropbtn) {
        console.warn('Dropdown elements not found. Skipping initialization.');
        return;
    }

    let escapeTimer;
    let visibilityTimer;

    function openDropdown() {
        dropdownContent.style.display = 'block';
        clearTimeout(escapeTimer); // Clear escape timer
        startVisibilityTimer(dropdownContent); // Start visibility timer
    }

    function closeDropdown() {
        dropdownContent.style.display = 'none';
        clearTimeout(visibilityTimer); // Clear visibility timer
    }

    dropbtn.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    dropbtn.addEventListener('mouseenter', openDropdown);
    dropdown.addEventListener('mouseleave', closeDropdown);

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            closeDropdown();
        }
    });
}

// Function to start the visibility timer
function startVisibilityTimer(dropdownContent) {
    const menuItems = dropdownContent.querySelectorAll('a');
    const visibilityDelay = 5000;

    visibilityTimer = setTimeout(() => {
        menuItems.forEach(makeItemEscape);
        clearTimeout(visibilityTimer); // Stop the timer
    }, visibilityDelay);
}

// Function to make menu items escape and bounce around
function makeItemEscape(item) {
    item.style.position = 'absolute';
    item.style.transition = 'transform 0.6s ease, top 0.6s ease, left 0.6s ease';

    function moveItem() {
        const randomX = Math.random() * (window.innerWidth - item.offsetWidth);
        const randomY = Math.random() * (window.innerHeight - item.offsetHeight);
        item.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }

    moveItem();
    clearInterval(item.escapeInterval);
    item.escapeInterval = setInterval(moveItem, 2000);
    item.style.pointerEvents = 'auto';
}

// Scroll event listener to detect scrolling
window.addEventListener('scroll', function () {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    console.log(`Current scroll position: ${scrollPosition}`);

    if (scrollPosition > 100) {
        console.log("You've scrolled more than 100px!");
    }
});

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
        }, 1800); // Delay text animation
    }, 1600); // Delay image animation
}

// Contact form submission
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
