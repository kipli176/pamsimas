(function registerPwa() {
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./service-worker.js")
            .catch((error) => {
                console.warn("Service worker gagal didaftarkan:", error);
            });
    });
})();
