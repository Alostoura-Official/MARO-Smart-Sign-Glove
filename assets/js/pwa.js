(() => {
  const status = document.getElementById('pwaStatus');
  const statusText = document.getElementById('pwaStatusText');
  const installButton = document.getElementById('installAppBtn');
  const updateButton = document.getElementById('updateAppBtn');
  let installPrompt = null;
  let waitingWorker = null;

  function updateConnection() {
    const online = navigator.onLine;
    status.classList.toggle('is-online', online);
    status.classList.toggle('is-offline', !online);
    statusText.textContent = online ? 'متصل بالإنترنت' : 'تعمل دون إنترنت';
    status.setAttribute('aria-label', online ? 'متصل بالإنترنت' : 'تعمل دون إنترنت');
    status.title = online ? 'متصل بالإنترنت' : 'تعمل دون إنترنت';
  }
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  updateConnection();

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installButton.hidden = true;
    statusText.textContent = navigator.onLine ? 'تم تثبيت التطبيق' : 'التطبيق مثبت ويعمل دون إنترنت';
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
        if (registration.waiting) showUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
          });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!window.__maroReloaded) { window.__maroReloaded = true; location.reload(); }
        });
        updateConnection();
      } catch (error) {
        console.error('MARO service worker registration failed:', error);
        statusText.textContent = 'تعذر تفعيل التخزين دون اتصال';
      }
    });
  } else {
    statusText.textContent = 'التثبيت والعمل Offline يتطلبان HTTPS';
  }

  function showUpdate(worker) {
    waitingWorker = worker;
    updateButton.hidden = false;
    updateButton.addEventListener('click', () => {
      if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }, { once: true });
  }
})();
