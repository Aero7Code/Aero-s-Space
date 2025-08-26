
// app.js
document.addEventListener('DOMContentLoaded', function() {
    // Event listener for form submission
    const form = document.getElementById('form');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Collect form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };

            // Check if all required fields are filled
            if (!formData.name || !formData.email || !formData.message) {
                alert('Please fill in all fields.');
                return;
            }

            // Make AJAX POST request
            fetch('/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    // Optionally, reset the form
                    form.reset();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while sending your message.');
            });
        });
    }
});