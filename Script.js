document.addEventListener('DOMContentLoaded', function () {
    // Dynamically load the header content
    const headerContainer = document.getElementById('header-container');
    fetch('header.html')
        .then(response => {
            console.log('Fetch response:', response); // Debugging: Log the entire response
            if (!response.ok) throw new Error('Header file not found');
            return response.text();
        })
        .then(data => {
            console.log('Header content:', data); // Debugging: Log the fetched HTML content
            headerContainer.innerHTML = data;
        })
        .catch(error => {
            console.error('Error loading header:', error); // Debugging: Log any errors
            headerContainer.innerHTML = '<p>Header could not be loaded. Please try again later.</p>';
        });

    // Handle dropdown functionality
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');

    document.addEventListener('click', function (event) {
        if (!dropdown.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    dropdown.addEventListener('click', function () {
        const isDisplayed = dropdownContent.style.display === 'block';
        dropdownContent.style.display = isDisplayed ? 'none' : 'block';
    });

    console.log('Website is loaded and ready!');
});


// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent the default form submission

    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // Form validation
    if (!name) {
        document.getElementById('response').textContent = 'Please provide your name.';
        return;
    }
    if (!email) {
        document.getElementById('response').textContent = 'Please provide your email.';
        return;
    }
    if (!message) {
        document.getElementById('response').textContent = 'Please provide a message.';
        return;
    }

    // Send form data to the backend
    try {
        const response = await fetch('http://localhost:5000/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, message }),
        });

        try {
            const result = await response.json();
            if (response.ok) {
                document.getElementById('response').textContent = result.message || 'Message sent successfully!';
            } else {
                document.getElementById('response').textContent = result.error || 'An error occurred while submitting the form.';
            }
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError);
            document.getElementById('response').textContent = 'An unexpected error occurred. Please try again.';
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        document.getElementById('response').textContent = 'An error occurred. Please try again later.';
    }
});
