// Authentication & Portal controller for HiddenGemsAI

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedRole = urlParams.get('role');
  const redirectTarget = urlParams.get('redirect');
  const verifyTokenParam = urlParams.get('verifyToken');
  const emailParam = urlParams.get('email');

  // Elements
  const devBanner = document.getElementById('dev-verify-banner');
  const devTokenText = document.getElementById('dev-token-text');
  const devEmailText = document.getElementById('dev-email-text');
  const btnDevVerify = document.getElementById('btn-dev-verify');
  const btnCloseVerify = document.getElementById('btn-close-verify');

  let currentVerificationToken = verifyTokenParam || '';
  let currentVerificationEmail = emailParam || '';

  // Tab switching logic
  function setupTabs(cardSelector) {
    const card = document.querySelector(cardSelector);
    if (!card) return;
    const tabButtons = card.querySelectorAll('.portal-tabs button');
    const loginForm = card.querySelector('.login-form');
    const registerForm = card.querySelector('.register-form');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.tab;
        if (mode === 'login') {
          loginForm.style.display = 'flex';
          registerForm.style.display = 'none';
        } else {
          loginForm.style.display = 'none';
          registerForm.style.display = 'flex';
        }
        clearMessages(card);
      });
    });
  }

  setupTabs('.portal-card.traveler');
  setupTabs('.portal-card.merchant');

  // Coming from the landing page's "Get started as a Traveler/Merchant" link:
  // highlight and scroll to the matching card so the choice already made isn't lost.
  if (requestedRole === 'traveler' || requestedRole === 'merchant') {
    const targetCard = document.querySelector(`.portal-card.${requestedRole}`);
    const otherCard = document.querySelector(`.portal-card.${requestedRole === 'traveler' ? 'merchant' : 'traveler'}`);
    if (targetCard) {
      targetCard.classList.add('portal-card-highlighted');
      if (otherCard) otherCard.classList.add('portal-card-dimmed');
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showMessage(card, type, text) {
    const msgEl = card.querySelector('.auth-message');
    if (!msgEl) return;
    msgEl.className = `auth-message ${type}`;
    msgEl.textContent = text;
    msgEl.style.display = 'block';
  }

  function clearMessages(card) {
    const msgEl = card.querySelector('.auth-message');
    if (msgEl) msgEl.style.display = 'none';
  }

  function showDevBanner(token, email) {
    currentVerificationToken = token;
    currentVerificationEmail = email;
    if (devTokenText) devTokenText.textContent = token;
    if (devEmailText) devEmailText.textContent = email ? ` (${email})` : '';
    if (devBanner) devBanner.style.display = 'block';
    devBanner?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideDevBanner() {
    if (devBanner) devBanner.style.display = 'none';
  }

  if (btnCloseVerify) {
    btnCloseVerify.addEventListener('click', hideDevBanner);
  }

  // Handle auto-verification if token in URL
  if (verifyTokenParam) {
    showDevBanner(verifyTokenParam, emailParam || '');
  }

  // Verification button handler
  if (btnDevVerify) {
    btnDevVerify.addEventListener('click', async () => {
      btnDevVerify.disabled = true;
      btnDevVerify.textContent = 'Verifying...';
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentVerificationToken, email: currentVerificationEmail })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          btnDevVerify.textContent = '✓ Verified!';
          if (devTokenText) devTokenText.textContent = 'Email successfully verified! You can now log in.';
          // Pre-fill email in corresponding login form and switch to login tab
          if (data.data?.user?.role) {
            const role = data.data.user.role;
            const card = document.querySelector(`.portal-card.${role}`);
            if (card) {
              const loginTabBtn = card.querySelector('.portal-tabs button[data-tab="login"]');
              if (loginTabBtn) loginTabBtn.click();
              const emailInput = card.querySelector('.login-form input[type="email"]');
              if (emailInput && data.data.user.email) emailInput.value = data.data.user.email;
              showMessage(card, 'success', 'Email verified! Please enter your password to log in.');
            }
          }
          setTimeout(() => {
            hideDevBanner();
            btnDevVerify.disabled = false;
            btnDevVerify.textContent = '✦ Verify email now';
          }, 3500);
        } else {
          alert(data.message || 'Verification failed. Please check the token.');
          btnDevVerify.disabled = false;
          btnDevVerify.textContent = '✦ Verify email now';
        }
      } catch (err) {
        console.error('Verify error:', err);
        alert('Network error while verifying email.');
        btnDevVerify.disabled = false;
        btnDevVerify.textContent = '✦ Verify email now';
      }
    });
  }

  // Traveler Login Form
  const travelerLoginForm = document.getElementById('traveler-login-form');
  if (travelerLoginForm) {
    travelerLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const card = travelerLoginForm.closest('.portal-card');
      clearMessages(card);
      const submitBtn = travelerLoginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      const email = travelerLoginForm.email.value.trim();
      const password = travelerLoginForm.password.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: 'traveler' })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('hgai_user', JSON.stringify(data.data.user));
          showMessage(card, 'success', 'Logged in successfully! Redirecting...');
          const nextUrl = redirectTarget && redirectTarget.includes('traveler') ? redirectTarget : 'traveler-details.html';
          setTimeout(() => { window.location.href = nextUrl; }, 600);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log in as Traveler →';
          if (data.unverified) {
            showMessage(card, 'error', data.message);
            if (data.data?.devVerificationToken) {
              showDevBanner(data.data.devVerificationToken, email);
            }
          } else {
            showMessage(card, 'error', data.message || 'Invalid email or password.');
          }
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in as Traveler →';
        showMessage(card, 'error', 'Unable to connect to server. Please try again.');
      }
    });
  }

  // Traveler Register Form
  const travelerRegisterForm = document.getElementById('traveler-register-form');
  if (travelerRegisterForm) {
    travelerRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const card = travelerRegisterForm.closest('.portal-card');
      clearMessages(card);
      const submitBtn = travelerRegisterForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const name = travelerRegisterForm.name.value.trim();
      const email = travelerRegisterForm.email.value.trim();
      const password = travelerRegisterForm.password.value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role: 'traveler' })
        });
        const data = await res.json();

        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Traveler Account →';

        if (res.ok && data.success) {
          showMessage(card, 'success', 'Account created! Please verify your email below before logging in.');
          showDevBanner(data.data.verificationToken, email);
          // Pre-fill email in login tab
          const loginTabBtn = card.querySelector('.portal-tabs button[data-tab="login"]');
          if (loginTabBtn) loginTabBtn.click();
          const loginEmailInput = card.querySelector('.login-form input[type="email"]');
          if (loginEmailInput) loginEmailInput.value = email;
        } else {
          showMessage(card, 'error', data.message || 'Registration failed.');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Traveler Account →';
        showMessage(card, 'error', 'Unable to connect to server. Please try again.');
      }
    });
  }

  // Merchant Login Form
  const merchantLoginForm = document.getElementById('merchant-login-form');
  if (merchantLoginForm) {
    merchantLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const card = merchantLoginForm.closest('.portal-card');
      clearMessages(card);
      const submitBtn = merchantLoginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      const email = merchantLoginForm.email.value.trim();
      const password = merchantLoginForm.password.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: 'merchant' })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          localStorage.setItem('hgai_user', JSON.stringify(data.data.user));
          showMessage(card, 'success', 'Logged in successfully! Redirecting...');
          const nextUrl = redirectTarget && redirectTarget.includes('merchant') ? redirectTarget : 'merchant-details.html';
          setTimeout(() => { window.location.href = nextUrl; }, 600);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log in as Merchant →';
          if (data.unverified) {
            showMessage(card, 'error', data.message);
            if (data.data?.devVerificationToken) {
              showDevBanner(data.data.devVerificationToken, email);
            }
          } else {
            showMessage(card, 'error', data.message || 'Invalid email or password.');
          }
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in as Merchant →';
        showMessage(card, 'error', 'Unable to connect to server. Please try again.');
      }
    });
  }

  // Merchant Register Form
  const merchantRegisterForm = document.getElementById('merchant-register-form');
  if (merchantRegisterForm) {
    merchantRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const card = merchantRegisterForm.closest('.portal-card');
      clearMessages(card);
      const submitBtn = merchantRegisterForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering business...';

      const businessName = merchantRegisterForm.businessName.value.trim();
      const email = merchantRegisterForm.email.value.trim();
      const phone = merchantRegisterForm.phone?.value.trim();
      const address = merchantRegisterForm.address?.value.trim();
      const latitude = merchantRegisterForm.latitude?.value.trim();
      const longitude = merchantRegisterForm.longitude?.value.trim();
      const password = merchantRegisterForm.password.value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: businessName, businessName, email, password, role: 'merchant', phone, address, latitude, longitude })
        });
        const data = await res.json();

        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Merchant Account →';

        if (res.ok && data.success) {
          showMessage(card, 'success', 'Merchant account created! Please verify your email below before logging in.');
          showDevBanner(data.data.verificationToken, email);
          // Pre-fill email in login tab
          const loginTabBtn = card.querySelector('.portal-tabs button[data-tab="login"]');
          if (loginTabBtn) loginTabBtn.click();
          const loginEmailInput = card.querySelector('.login-form input[type="email"]');
          if (loginEmailInput) loginEmailInput.value = email;
        } else {
          showMessage(card, 'error', data.message || 'Registration failed.');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Merchant Account →';
        showMessage(card, 'error', 'Unable to connect to server. Please try again.');
      }
    });
  }

  // Check if currently authenticated
  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.user) {
          const user = data.data.user;
          const statusBanner = document.getElementById('active-session-banner');
          if (statusBanner) {
            statusBanner.style.display = 'block';
            statusBanner.innerHTML = `
              <div class="user-profile-pill" style="display:inline-flex;margin:10px auto;">
                <span>Logged in as <b>${user.name || user.email}</b></span>
                <span class="user-role">${user.role}</span>
                <a href="${user.role === 'merchant' ? 'merchant.html' : 'customer.html'}" style="color:#d9367b;font-weight:800;text-decoration:none;margin-left:8px;">Open Dashboard →</a>
              </div>
            `;
          }
        }
      }
    } catch (err) {
      // not logged in, ignore
    }
  }

  checkSession();
});
