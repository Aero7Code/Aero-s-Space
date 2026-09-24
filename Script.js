document.documentElement.classList.add('js');

const CONTACT_ENDPOINT = 'https://aerospace.taila128b4.ts.net:10000/contact';

document.addEventListener('DOMContentLoaded', () => {
    for (const dropdown of document.querySelectorAll('.dropdown')) {
        const button = dropdown.querySelector('.dropbtn');
        const menu = dropdown.querySelector('.dropdown-content');
        if (!button || !menu) continue;

        const close = () => {
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', 'Open navigation menu');
        };
        button.addEventListener('click', () => {
            const opening = button.getAttribute('aria-expanded') !== 'true';
            button.setAttribute('aria-expanded', String(opening));
            button.setAttribute('aria-label', opening ? 'Close navigation menu' : 'Open navigation menu');
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

    const form = document.getElementById('contact-form');
    if (!form) return;
    const status = document.getElementById('response');
    const button = form.querySelector('button[type="submit"]');
    let pendingId;
    let pendingPayload;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const name = form.elements.namedItem('name').value.trim();
        const email = form.elements.namedItem('email').value.trim();
        const message = form.elements.namedItem('message').value.trim();
        const website = form.elements.namedItem('website').value;
        if (!name || !email || !message) {
            status.dataset.state = 'error';
            status.textContent = 'Please complete every field.';
            return;
        }

        const payload = JSON.stringify({ name, email, message, website });
        if (payload !== pendingPayload) {
            pendingId = crypto.randomUUID();
            pendingPayload = payload;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        button.disabled = true;
        status.dataset.state = '';
        status.textContent = 'Sending your message…';
        let failureMessage = 'Could not send your message. Please try again.';
        try {
            const response = await fetch(CONTACT_ENDPOINT, {
                method: 'POST',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': pendingId,
                },
                body: payload,
                signal: controller.signal,
            });
            const result = await response.json().catch(() => null);
            if (!response.ok) {
                if (result && typeof result.message === 'string') failureMessage = result.message;
                throw new Error('Request failed');
            }
            status.dataset.state = 'success';
            status.textContent = 'Message received. Thank you!';
            pendingId = undefined;
            pendingPayload = undefined;
            form.reset();
        } catch (error) {
            status.dataset.state = 'error';
            status.textContent = error.name === 'AbortError'
                ? 'The request timed out. Please try again.'
                : failureMessage;
        } finally {
            clearTimeout(timeout);
            button.disabled = false;
        }
    });
});
