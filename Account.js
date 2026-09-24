const ACCOUNT_ENDPOINT = 'https://aerospace.taila128b4.ts.net:8443';
const TOKEN_KEY = 'aerosspace-account-session';
const DEVICE_KEY = 'aerosspace-browser-device';

const createDeviceToken = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
};

const getDeviceToken = () => {
    try {
        const saved = localStorage.getItem(DEVICE_KEY);
        if (saved && /^[A-Za-z0-9_-]{32,128}$/.test(saved)) return saved;
        const created = createDeviceToken();
        localStorage.setItem(DEVICE_KEY, created);
        return created;
    } catch (_error) {
        return createDeviceToken();
    }
};

const deviceLabel = () => {
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
    const agent = navigator.userAgent;
    const browser = agent.includes('Firefox/') ? 'Firefox'
        : agent.includes('Edg/') ? 'Edge'
            : agent.includes('Chrome/') ? 'Chrome'
                : agent.includes('Safari/') ? 'Safari' : 'Web browser';
    return `${browser} on ${platform}`.replace(/[^\x20-\x7E]/g, '').slice(0, 80);
};

document.addEventListener('DOMContentLoaded', () => {
    const authView = document.getElementById('auth-view');
    if (!authView) return;

    const verifyView = document.getElementById('verify-view');
    const profileView = document.getElementById('profile-view');
    const status = document.getElementById('account-status');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginPanel = document.getElementById('login-panel');
    const signupPanel = document.getElementById('signup-panel');
    let verificationUsername = '';
    let token = sessionStorage.getItem(TOKEN_KEY) || '';
    let onboardingState = '';
    let checkingConnection = false;
    const deviceToken = getDeviceToken();

    const setStatus = (message = '', state = '') => {
        status.textContent = message;
        status.dataset.state = state;
        status.hidden = !message;
        if (message) status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const setBusy = (form, busy) => {
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = busy;
        form.setAttribute('aria-busy', String(busy));
    };

    const request = async (path, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const headers = {
            'Content-Type': 'application/json',
            'X-Aero-Device': deviceToken,
            'X-Aero-Device-Label': deviceLabel(),
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
            const response = await fetch(`${ACCOUNT_ENDPOINT}${path}`, {
                method: options.method || 'POST',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-store',
                headers,
                body: options.body === undefined ? undefined : JSON.stringify(options.body),
                signal: controller.signal,
            });
            const result = await response.json().catch(() => ({ message: 'The account service returned an unexpected response.' }));
            if (!response.ok) throw new Error(result.message || 'Please try again.');
            return result;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    };

    const showTab = (name) => {
        const login = name === 'login';
        loginTab.setAttribute('aria-selected', String(login));
        signupTab.setAttribute('aria-selected', String(!login));
        loginPanel.hidden = !login;
        signupPanel.hidden = login;
        (login ? document.getElementById('login-username') : document.getElementById('signup-username')).focus();
    };

    const showAuth = () => {
        authView.hidden = false;
        verifyView.hidden = true;
        profileView.hidden = true;
    };

    const showVerify = (message) => {
        authView.hidden = true;
        verifyView.hidden = false;
        profileView.hidden = true;
        document.getElementById('verify-message').textContent = message;
        document.getElementById('verify-code').focus();
    };

    const renderUser = (user) => {
        authView.hidden = true;
        verifyView.hidden = true;
        profileView.hidden = false;
        document.getElementById('profile-greeting').textContent = user.displayName;
        document.getElementById('display-name').value = user.displayName;
        document.getElementById('accent').value = user.accent;
        document.getElementById('audio-language').value = user.audioLanguage;
        document.getElementById('subtitle-mode').value = user.subtitleMode;
        document.getElementById('known-device-count').textContent = String(user.deviceCount || 1);
        const connectionReady = user.onboardingState === 'device_ready';
        onboardingState = user.onboardingState;
        document.getElementById('connection-queued').hidden = !['queued', 'inviting', 'not_started'].includes(user.onboardingState);
        document.getElementById('connection-invited').hidden = user.onboardingState !== 'invited';
        document.getElementById('connection-ready').hidden = !connectionReady;
        document.getElementById('connection-duplicate').hidden = user.onboardingState !== 'duplicate';
        document.getElementById('connection-mismatch').hidden = user.onboardingState !== 'identity_mismatch';
        document.getElementById('jellyfin-waiting').hidden = connectionReady || user.jellyfinReady;
        document.getElementById('jellyfin-pending').hidden = !connectionReady || user.jellyfinReady;
        document.getElementById('jellyfin-ready').hidden = !user.jellyfinReady;
        if (user.jellyfinReady) document.getElementById('jellyfin-link').href = user.jellyfinUrl;
    };

    const acceptSession = (result) => {
        token = result.token;
        sessionStorage.setItem(TOKEN_KEY, token);
        renderUser(result.user);
    };

    loginTab.addEventListener('click', () => showTab('login'));
    signupTab.addEventListener('click', () => showTab('signup'));
    for (const checkbox of document.querySelectorAll('[data-show-password]')) {
        checkbox.addEventListener('change', () => {
            const input = document.getElementById(checkbox.dataset.showPassword);
            input.type = checkbox.checked ? 'text' : 'password';
        });
    }

    document.getElementById('signup-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const body = Object.fromEntries(new FormData(form));
        setBusy(form, true);
        setStatus('Creating your private account…');
        try {
            const result = await request('/auth/signup', { body });
            verificationUsername = result.username;
            setStatus('');
            showVerify(result.message);
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });

    document.getElementById('verify-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        setBusy(form, true);
        setStatus('Checking your code…');
        try {
            const result = await request('/auth/verify', {
                body: { username: verificationUsername, code: form.elements.code.value.trim() },
            });
            acceptSession(result);
            setStatus('Account verified. The setup assistant is preparing your private connection.', 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });

    document.getElementById('back-to-signup').addEventListener('click', () => {
        verificationUsername = '';
        showAuth();
        showTab('signup');
        setStatus('');
    });

    document.getElementById('resend-code').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const result = await request('/auth/resend', { body: { username: verificationUsername } });
            document.getElementById('verify-message').textContent = result.message;
            setStatus(result.message, 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        setBusy(form, true);
        setStatus('Signing you in…');
        try {
            const result = await request('/auth/login', { body: Object.fromEntries(new FormData(form)) });
            acceptSession(result);
            form.reset();
            setStatus('Welcome back.', 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });

    document.getElementById('profile-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        setBusy(form, true);
        try {
            const result = await request('/auth/profile', {
                method: 'PATCH', body: Object.fromEntries(new FormData(form)),
            });
            renderUser(result.user);
            setStatus(result.message, 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });

    document.getElementById('jellyfin-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        setBusy(form, true);
        setStatus('Setting up your restricted movie profile…');
        try {
            const result = await request('/auth/jellyfin', {
                body: { password: form.elements.password.value },
            });
            form.reset();
            renderUser(result.user);
            setStatus(result.message, 'success');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            setBusy(form, false);
        }
    });

    document.getElementById('refresh-connection').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const result = await request('/auth/me', { method: 'GET' });
            renderUser(result.user);
            setStatus(result.user.onboardingState === 'device_ready'
                ? 'Your approved device is connected.'
                : 'The assistant is still waiting for the Tailscale connection.',
            result.user.onboardingState === 'device_ready' ? 'success' : '');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('logout-button').addEventListener('click', async () => {
        try { await request('/auth/logout', { body: {} }); } catch (_error) { /* Local logout still succeeds. */ }
        token = '';
        sessionStorage.removeItem(TOKEN_KEY);
        showAuth();
        showTab('login');
        setStatus('You are signed out.', 'success');
    });

    if (token) {
        request('/auth/me', { method: 'GET' })
            .then((result) => renderUser(result.user))
            .catch(() => {
                token = '';
                sessionStorage.removeItem(TOKEN_KEY);
                showAuth();
            });
    }

    window.setInterval(async () => {
        if (!token || onboardingState !== 'invited' || checkingConnection || document.hidden) return;
        checkingConnection = true;
        try {
            const result = await request('/auth/me', { method: 'GET' });
            renderUser(result.user);
            if (result.user.onboardingState === 'device_ready') {
                setStatus('Your approved connection is ready. You can finish your movie profile now.', 'success');
            }
        } catch (_error) {
            // The manual status button remains available if a background check fails.
        } finally {
            checkingConnection = false;
        }
    }, 20000);
});
