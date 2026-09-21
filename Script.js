document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {

    for (const dropdown of document.querySelectorAll('.dropdown')) {
        const button = dropdown.querySelector('.dropbtn');
        const menu = dropdown.querySelector('.dropdown-content');
        if (!button || !menu) continue;

        const close = () => button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => {
            button.setAttribute(
                'aria-expanded',
                String(button.getAttribute('aria-expanded') !== 'true')
            );
        });
        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target)) close();
        });
        dropdown.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                close();
                button.focus();
            }
        });
    }

    for (const form of document.querySelectorAll('#contact-form')) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const name = form.elements.namedItem('name').value.trim();
            const email = form.elements.namedItem('email').value.trim();
            const message = form.elements.namedItem('message').value.trim();
            const response = form.parentElement.querySelector('#response');
            if (!name || !email || !message) {
                response.textContent = 'Please complete every field.';
                return;
            }

            const subject = encodeURIComponent("Aero's Space contact");
            const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
            response.textContent = 'Your email app will open a draft. Send it from there to complete your message.';
            window.location.href = `mailto:lexyloveonme+AeroSpace@gmail.com?subject=${subject}&body=${body}`;
        });
    }
});
