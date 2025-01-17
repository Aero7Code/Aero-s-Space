// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent the default form submission

    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // Simple form validation
    if (!name || !email || !message) {
        document.getElementById('response').textContent = 'Please fill in all fields.';
        return;
    }

    // Send form data to the backend (Python server)
    try {
        const response = await fetch('http://localhost:5000/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, message }),
        });

        if (response.ok) {
            document.getElementById('response').textContent = 'Your message has been sent!';
            document.getElementById('contact-form').reset();
        } else {
            document.getElementById('response').textContent = 'There was an error. Please try again later.';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('response').textContent = 'There was an error. Please try again later.';
    }
});

// Add a simple interactive dropdown toggle
document.addEventListener('DOMContentLoaded', function () {
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');

    // Close dropdown if user clicks outside
    document.addEventListener('click', function (event) {
        if (!dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Toggle dropdown menu
    dropdown.addEventListener('click', function () {
        const isDisplayed = dropdownContent.style.display === 'block';
        dropdownContent.style.display = isDisplayed ? 'none' : 'block';
    });

    console.log('Website is loaded and ready!');
});
