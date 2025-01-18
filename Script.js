document.addEventListener('DOMContentLoaded', function () {
    // Dynamically load the header content only if it's not already loaded
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer.innerHTML.trim()) {
        loadHeader(headerContainer);
    }

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

document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    dropdown.addEventListener('click', (event) => {
        const isDisplayed = dropdownContent.style.display === 'block';
        dropdownContent.style.display = isDisplayed ? 'none' : 'block';
        event.stopPropagation(); // Prevent immediate closing
    });
});


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
