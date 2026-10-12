"use strict";
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. AUTH & ROLE GUARD DENGAN POP-UP MODAL ELEGAN ---
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    if (!token || (role !== "admin" && role !== "moderator")) {
        tampilkanModalAksesDitolak(token, role);
        return;
    }
    function tampilkanModalAksesDitolak(authToken, userRole) {
        // Sembunyikan konten admin dan navbar agar data terlindungi dari pengguna yang tidak berhak
        const adminGrid = document.querySelector(".admin-grid");
        if (adminGrid)
            adminGrid.style.display = "none";
        const navbar = document.querySelector(".navbar");
        if (navbar)
            navbar.style.display = "none";
        let alasan = "Sesi login Anda tidak ditemukan atau telah kedaluwarsa.";
        let subteks = "Anda harus masuk dengan kredensial Administrator atau Moderator untuk mengelola sistem antrian.";
        const isOperator = !!authToken && userRole === "user";
        if (authToken && userRole) {
            alasan = `Akun Anda terdaftar dengan hak akses "${userRole.toUpperCase()}".`;
            subteks = "Halaman Dashboard Admin hanya dapat diakses oleh Administrator atau Moderator Rumah Sakit.";
        }
        const overlay = document.createElement("div");
        overlay.className = "auth-modal-overlay";
        overlay.id = "auth-modal-denied";
        overlay.setAttribute("role", "alertdialog");
        overlay.setAttribute("aria-modal", "true");
        let sisaWaktu = 3;
        overlay.innerHTML = `
            <div class="auth-modal-card">
                <div class="auth-modal-icon-badge" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <span class="auth-modal-pill">Autentikasi Diperlukan</span>
                <h2 class="auth-modal-title">Akses Ditolak</h2>
                <p class="auth-modal-desc">${esc(alasan)}</p>
                <p class="auth-modal-subdesc">${esc(subteks)}</p>

                <div class="auth-modal-countdown-box">
                    <div class="auth-modal-countdown-label">
                        <span>Mengalihkan otomatis ke login</span>
                        <strong id="auth-countdown-sec">${sisaWaktu} detik</strong>
                    </div>
                    <div class="auth-countdown-track">
                        <div class="auth-countdown-bar"></div>
                    </div>
                </div>

                <div class="auth-modal-actions">
                    <button type="button" id="btn-auth-redirect-login" class="btn-auth-redirect">
                        Ke Halaman Login Sekarang
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                    ${isOperator ? `
                    <a href="operator.html" class="btn-auth-secondary">
                        Buka Panel Operator
                    </a>
                    ` : ""}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const redirectKeLogin = () => {
            window.location.href = "login.html";
        };
        const countdownEl = document.getElementById("auth-countdown-sec");
        const timerId = window.setInterval(() => {
            sisaWaktu--;
            if (countdownEl) {
                countdownEl.textContent = `${sisaWaktu} detik`;
            }
            if (sisaWaktu <= 0) {
                clearInterval(timerId);
                redirectKeLogin();
            }
        }, 1000);
        const btnRedirect = document.getElementById("btn-auth-redirect-login");
        if (btnRedirect) {
            btnRedirect.addEventListener("click", () => {
                clearInterval(timerId);
                redirectKeLogin();
            });
        }
    }
    // Tampilkan nama admin di navbar
    const adminNameSpan = document.getElementById("admin-name");
    const firstName = localStorage.getItem("firstName") || "Admin";
    if (adminNameSpan) {
        adminNameSpan.textContent = `${firstName} (${role.toUpperCase()})`;
    }
    // Tombol Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ["accessToken", "userRole", "firstName"].forEach(k => localStorage.removeItem(k));
            window.location.href = "login.html";
        });
    }
    // --- 2. DOM ELEMENTS ---
    const layananForm = document.getElementById("layanan-form");
    const kodeInput = document.getElementById("kode-layanan");
    const namaInput = document.getElementById("nama-layanan");
    const listLayananContainer = document.getElementById("list-layanan-container");
    const resetAllBtn = document.getElementById("reset-all-btn");
    const tiketManualForm = document.getElementById("tiket-manual-form");
    const selectLayanan = document.getElementById("select-layanan");
    const selectPrioritas = document.getElementById("select-prioritas");
    const listTiketContainer = document.getElementById("list-tiket-container");
    // --- 3. RENDER FUNCTIONS ---
    function renderLayanan() {
        const daftarLayanan = bacaLayanan();
        listLayananContainer.innerHTML = "";
        // Pertahankan nilai select yang sedang dipilih admin jika ada
        const nilaiTerpilih = selectLayanan.value;
        selectLayanan.innerHTML = '<option value="">-- Pilih Layanan --</option>';
        daftarLayanan.forEach((layanan) => {
            // Isi dropdown select tiket manual
            const option = document.createElement("option");
            option.value = layanan.kode;
            option.textContent = `${layanan.nama} (${layanan.kode})`;
            if (!layanan.aktif)
                option.disabled = true;
            selectLayanan.appendChild(option);
            // Render list item CRUD
            const itemDiv = document.createElement("div");
            itemDiv.className = "crud-item";
            itemDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong>${esc(layanan.nama)}</strong>
                    <span class="badge-prioritas">[${esc(layanan.kode)}]</span> 
                    <span class="badge-status ${layanan.aktif ? 'badge-aktif' : 'badge-nonaktif'}">
                        ${layanan.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                </div>
                <div style="display: flex; gap: 0.35rem;">
                    <button type="button" data-id="${esc(layanan.id)}" class="toggle-btn btn-sekunder" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; box-shadow: none;">
                        ${layanan.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button type="button" data-id="${esc(layanan.id)}" class="delete-btn" style="background-color: var(--danger); color: white; padding: 0.25rem 0.6rem; font-size: 0.75rem; box-shadow: none;">
                        Hapus
                    </button>
                </div>
            `;
            listLayananContainer.appendChild(itemDiv);
        });
        if (nilaiTerpilih) {
            selectLayanan.value = nilaiTerpilih;
        }
        // Attach Event Listeners for Dynamic Buttons
        document.querySelectorAll(".toggle-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                toggleLayanan(id);
            });
        });
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.currentTarget.getAttribute("data-id");
                deleteLayanan(id);
            });
        });
    }
    function renderTiket() {
        const daftarTiket = bacaTiket();
        listTiketContainer.innerHTML = "";
        if (daftarTiket.length === 0) {
            listTiketContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">Belum ada tiket aktif.</p>`;
            return;
        }
        // Tampilkan 10 tiket terbaru
        daftarTiket.slice(-10).reverse().forEach(tiket => {
            const ticketDiv = document.createElement("div");
            ticketDiv.className = "crud-item";
            let statusClass = "tiket-status-menunggu";
            if (tiket.status === "Dipanggil")
                statusClass = "tiket-status-dipanggil";
            else if (tiket.status === "Selesai")
                statusClass = "tiket-status-selesai";
            else if (tiket.status === "Lewati")
                statusClass = "tiket-status-lewati";
            ticketDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="font-size: 0.95rem; font-variant-numeric: tabular-nums;">${esc(tiket.nomorTampil)}</strong>
                    <span class="badge-prioritas">${esc(tiket.prioritas)}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${esc(tiket.waktu)}</span>
                </div>
                <span class="badge-tiket-status ${statusClass}">${esc(tiket.status)}</span>
            `;
            listTiketContainer.appendChild(ticketDiv);
        });
    }
    // --- 3.5. CUSTOM TOAST NOTIFICATION (BONUS UI/UX) ---
    function tampilkanToast(pesan, tipe = "sukses") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${tipe}`;
        toast.innerHTML = `
            <span class="toast-dot"></span>
            <span>${esc(pesan)}</span>
        `;
        container.appendChild(toast);
        window.setTimeout(() => {
            toast.style.animation = "toastFadeOut 0.25s forwards";
            window.setTimeout(() => toast.remove(), 250);
        }, 3200);
    }
    // --- 4. CRUD LOGIC & VALIDATION ---
    layananForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const kode = kodeInput.value.toUpperCase().trim();
        const nama = namaInput.value.trim();
        if (!/^[A-Z]$/.test(kode)) {
            tampilkanToast("Kode layanan harus persis 1 huruf kapital (A-Z)!", "error");
            return;
        }
        const daftarLayanan = bacaLayanan();
        // Validasi Duplikasi Case-Insensitive (Kode & Nama)
        const isDuplicate = daftarLayanan.some(l => l.kode.toUpperCase() === kode ||
            l.nama.toLowerCase() === nama.toLowerCase());
        if (isDuplicate) {
            tampilkanToast("Kode atau nama layanan sudah terdaftar! Gunakan nama lain.", "peringatan");
            return;
        }
        const newLayanan = {
            id: Date.now().toString(),
            kode: kode,
            nama: nama,
            aktif: true
        };
        daftarLayanan.push(newLayanan);
        simpanLayanan(daftarLayanan);
        kodeInput.value = "";
        namaInput.value = "";
        renderLayanan();
        tampilkanToast(`Layanan ${nama} [${kode}] berhasil ditambahkan!`, "sukses");
    });
    function toggleLayanan(id) {
        if (!id)
            return;
        const daftarLayanan = bacaLayanan();
        const diperbarui = daftarLayanan.map(l => l.id === id ? Object.assign(Object.assign({}, l), { aktif: !l.aktif }) : l);
        simpanLayanan(diperbarui);
        renderLayanan();
        const layananTarget = diperbarui.find(l => l.id === id);
        if (layananTarget) {
            tampilkanToast(`Layanan ${layananTarget.nama} telah ${layananTarget.aktif ? "diaktifkan" : "dinonaktifkan"}.`, "sukses");
        }
    }
    function deleteLayanan(id) {
        if (!id)
            return;
        if (confirm("Yakin ingin menghapus layanan ini?")) {
            const daftarLayanan = bacaLayanan();
            const tersisa = daftarLayanan.filter(l => l.id !== id);
            simpanLayanan(tersisa);
            renderLayanan();
            tampilkanToast("Layanan berhasil dihapus.", "sukses");
        }
    }
    // --- 5. TERBITKAN TIKET MANUAL ---
    tiketManualForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const kodeLayanan = selectLayanan.value;
        if (!kodeLayanan) {
            tampilkanToast("Silakan pilih layanan terlebih dahulu!", "peringatan");
            return;
        }
        const prioritas = selectPrioritas.value;
        if (!isPrioritas(prioritas)) {
            tampilkanToast("Tingkat prioritas tidak valid!", "error");
            return;
        }
        // Menggunakan fungsi inti terbitkanTiket dari queue.ts agar format dan penomoran konsisten
        const tiketBaru = terbitkanTiket(kodeLayanan, prioritas);
        renderTiket();
        tampilkanToast(`Berhasil menerbitkan tiket manual: ${tiketBaru.nomorTampil} (${prioritas})`, "sukses");
    });
    // --- 6. RESET SELURUH ANTRIAN ---
    resetAllBtn.addEventListener("click", () => {
        if (confirm("PERINGATAN: Apakah Anda yakin ingin mereset seluruh data antrian aktif?")) {
            resetAntrian();
            renderTiket();
            tampilkanToast("Semua data antrian berhasil direset ke awal.", "sukses");
        }
    });
    // --- 7. AUTO-POLLING & STORAGE EVENT SINKRONISASI ---
    window.setInterval(() => {
        renderLayanan();
        renderTiket();
    }, 2000);
    window.addEventListener("storage", (e) => {
        if (e.key === KUNCI_LAYANAN)
            renderLayanan();
        if (e.key === KUNCI_TIKET)
            renderTiket();
    });
    // Initial Render on Load
    renderLayanan();
    renderTiket();
});
