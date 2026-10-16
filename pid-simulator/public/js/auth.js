// Protege páginas que exigem login: redireciona para login.html se não houver token
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = '';

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setToken(data.token);
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = '';

  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      auth: false,
    });
    window.location.href = 'login.html?registered=1';
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

function logout() {
  clearToken();
  window.location.href = 'login.html';
}
