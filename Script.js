document.addEventListener('DOMContentLoaded', function () {
    // Dynamically load the header content
    const headerContainer = document.getElementById('header-container');
    fetch('header.html')
        .then(response => {
            console.log('Fetch response:', response); // Debugging
            if (!response.ok) throw new Error('Header file not found');
            return response.text();
        })
        .then(data => {
            headerContainer.innerHTML = data;
            console.log('Header content:', data); // Debugging

            // Bind dropdown functionality after header is loaded
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
        })
        .catch(error => {
            console.error('Error loading header:', error);
            headerContainer.innerHTML = '<p>Header could not be loaded. Please try again later.</p>';
        });

    console.log('Website is loaded and ready!');
});

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message }),
        });

        const result = await response.json();
        document.getElementById('response').textContent =
            response.ok ? result.message || 'Message sent successfully!' : result.error || 'An error occurred.';
    } catch (error) {
        console.error('Error submitting form:', error);
        document.getElementById('response').textContent = 'An error occurred. Please try again later.';
    }
});
