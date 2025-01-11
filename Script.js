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
