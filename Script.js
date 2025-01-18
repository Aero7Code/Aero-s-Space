document.addEventListener('DOMContentLoaded', function () {
    // Dynamically load the header content only if it's not already loaded
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer.innerHTML.trim()) {
        fetch('header.html', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
            },
            credentials: 'include', // Include credentials for cookies/authentication if required
        })
            .then(response => {
                console.log('Fetch response:', response); // Debugging
                if (!response.ok) throw new Error(`Header file not found. Status: ${response.status}`);
                return response.text();
            })
            .then(data => {
                headerContainer.innerHTML = data;
                console.log('Header content:', data); // Debugging

                // Initialize dropdown functionality after header is loaded
                initDropdown();
            })
            .catch(error => {
                console.error('Error loading header:', error); // Debugging
                const errorMessage = error.message.includes('CORS')
                    ? 'A CORS error occurred. Please check your backend configuration.'
                    : 'Header could not be loaded. Please try again later.';
                headerContainer.innerHTML = `<p>${errorMessage}</p>`;
            });
    }

    console.log('Website is loaded and ready!');
});

// Initialize dropdown functionality
function initDropdown() {
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');

    document.addEventListener('click', function (event) {
        if (dropdown && !dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    if (dropdown) {
        dropdown.addEventListener('click', function () {
            const isDisplayed = dropdownContent.style.display === 'block';
            dropdownContent.style.display = isDisplayed ? 'none' : 'block';
        });
    }
}

// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !message) {
        document.getElementById('response').textContent = 'All fields are required.';
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/contact', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer <your-token>' // Optional: Include auth tokens if needed
            },
            body: JSON.stringify({ name, email, message }),
            credentials: 'include', // Include credentials for cookies/authentication if required
        });

        const result = await response.json();
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
