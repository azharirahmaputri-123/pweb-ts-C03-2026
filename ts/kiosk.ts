document.addEventListener("DOMContentLoaded", () => {
    // --- 0. AUTH GUARD (REVISI SOAL: WAJIB LOGIN UNTUK SEMUA AKSES) ---
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");

    if (!token) {
        tampilkanModalAksesDitolak(
            "Sesi login Anda tidak ditemukan atau telah kedaluwarsa.",
            "Sesuai regulasi terbaru, Anda harus masuk (login) terlebih dahulu untuk mengambil nomor tiket antrian.",
            "login.html",
            "Ke Halaman Login Sekarang"
        );
        return;
    }

    // Tampilkan info akun pengguna & tautan staf jika admin
    const firstName = localStorage.getItem("firstName") || "Pengguna";
    const userRole = (role || "user").toUpperCase();

    const userNameEl = document.getElementById("kiosk-user-name");
    const userRoleEl = document.getElementById("kiosk-user-role");
    const userAvatarEl = document.getElementById("user-avatar-initial");

    if (userNameEl) userNameEl.textContent = firstName;
    if (userRoleEl) userRoleEl.textContent = userRole;
    if (userAvatarEl) userAvatarEl.textContent = firstName.charAt(0).toUpperCase();

    if (role === "admin" || role === "moderator") {
        const staffNav = document.getElementById("staff-nav-group");
        if (staffNav) staffNav.style.display = "inline-flex";
    }

    // Tombol Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ["accessToken", "userRole", "firstName"].forEach(k => localStorage.removeItem(k));
            window.location.href = "login.html";
        });
    }

    const kioskContainer = document.getElementById("kiosk-container") as HTMLElement | null;
    const fullscreenBtn = document.getElementById("fullscreen-btn") as HTMLButtonElement | null;
    const modalContainer = document.getElementById("ticket-modal-container") as HTMLElement | null;

    if (!kioskContainer) return;

    // --- 1. FULLSCREEN API HANDLER ---
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (err: unknown) {
                console.warn("Fullscreen toggle gagal:", err);
            }
        });

        document.addEventListener("fullscreenchange", () => {
            const labelEl = document.getElementById("fullscreen-label");
            if (document.fullscreenElement) {
                if (labelEl) labelEl.textContent = "Keluar Penuh";
                else fullscreenBtn.textContent = "Keluar Layar Penuh";
            } else {
                if (labelEl) labelEl.textContent = "Layar Penuh";
                else fullscreenBtn.textContent = "Layar Penuh";
            }
        });
    }

    // --- 2. AUDIO EFFECT (NATIVE WEB AUDIO API) ---
    // Memberikan feedback audio bel/chime lembut saat tiket dicetak
    function bunyikanChime(): void {
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const mainkanNada = (freq: number, delay: number, durasi: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + durasi);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + durasi);
            };

            // Harmoni dua nada (C5 & E5)
            mainkanNada(523.25, 0, 0.4);
            mainkanNada(659.25, 0.15, 0.5);
        } catch {
            // Abaikan jika browser membatasi autoplay
        }
    }

    // --- 3. MODAL DIALOG STRUK TIKET DIGITAL ---
    let timerTutupModal: number | null = null;

    function tutupModal(): void {
        if (!modalContainer) return;
        modalContainer.replaceChildren();
        if (timerTutupModal !== null) {
            window.clearTimeout(timerTutupModal);
            timerTutupModal = null;
        }
    }

    function tampilkanModalTiket(layanan: Layanan, tiket: Tiket): void {
        if (!modalContainer) return;
        tutupModal();

        // Hitung estimasi antrian di depan tiket ini
        const antrian = daftarMenunggu(tiket.layananKode);
        const urutanKe = antrian.findIndex(t => t.id === tiket.id);
        const antrianDiDepan = urutanKe > 0 ? urutanKe : 0;

        const overlay = document.createElement("div");
        overlay.className = "ticket-modal-overlay";

        const receipt = document.createElement("article");
        receipt.className = "ticket-receipt";

        receipt.innerHTML = `
            <div class="receipt-header">
                <div class="receipt-hospital">RUMAH SAKIT SEHAT BERSAMA</div>
                <div class="receipt-service">${esc(layanan.nama)}</div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">NOMOR ANTRIAN ANDA</div>
            <div class="receipt-number">${esc(tiket.nomorTampil)}</div>
            <div class="receipt-meta">
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Kategori Prioritas:</span>
                    <span class="receipt-meta-value">${esc(tiket.prioritas)}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Waktu Pengambilan:</span>
                    <span class="receipt-meta-value">${esc(tiket.waktu)}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Antrian di Depan:</span>
                    <span class="receipt-meta-value">${antrianDiDepan} orang</span>
                </div>
            </div>
            <p class="receipt-note">Silakan perhatikan layar monitor dan tunggu panggilan sesuai nomor antrian Anda.</p>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn-close-receipt" id="btn-close-receipt" style="flex: 1;">Selesai / Ambil Tiket</button>
                <button type="button" class="btn-close-receipt" id="btn-print-receipt" style="width: auto; background-color: var(--primary-peach); padding: 0.75rem 1rem;" title="Cetak Struk">Cetak Struk</button>
            </div>
            <div class="countdown-bar"></div>
        `;

        overlay.appendChild(receipt);
        modalContainer.appendChild(overlay);

        // Event tutup manual
        const btnClose = receipt.querySelector("#btn-close-receipt") as HTMLButtonElement | null;
        if (btnClose) {
            btnClose.addEventListener("click", tutupModal);
        }

        // Tombol cetak fisik (opsional browser print)
        const btnPrint = receipt.querySelector("#btn-print-receipt") as HTMLButtonElement | null;
        if (btnPrint) {
            btnPrint.addEventListener("click", () => {
                window.print();
            });
        }

        // Klik di luar kartu receipt juga menutup modal
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) tutupModal();
        });

        // Bunyikan chime & set timer otomatis tutup setelah 5 detik
        bunyikanChime();
        timerTutupModal = window.setTimeout(tutupModal, 5000);
    }

    // --- 4. AKSI AMBIL TIKET ---
    function ambilTiket(layanan: Layanan, prioritas: Prioritas): void {
        const tiketBaru = terbitkanTiket(layanan.kode, prioritas);
        tampilkanModalTiket(layanan, tiketBaru);
        render(); // Langsung perbarui jumlah antrean di kartu kiosk
    }

    // --- 5. RENDER KARTU KIOSK SELF-SERVICE ---
    function render(): void {
        if (!kioskContainer) return;

        const semuaLayanan = bacaLayanan();
        const semuaTiket = bacaTiket();
        const layananAktif = semuaLayanan.filter(l => l.aktif);

        kioskContainer.replaceChildren();

        if (layananAktif.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "empty-state-info";
            emptyEl.innerHTML = `
                <h3>Layanan Belum Tersedia</h3>
                <p>Saat ini belum ada jenis antrian yang diaktifkan oleh admin.</p>
            `;
            kioskContainer.appendChild(emptyEl);
            return;
        }

        layananAktif.forEach(layanan => {
            const menunggu = jumlahMenunggu(layanan.kode, semuaTiket);
            const card = document.createElement("article");
            card.className = "kiosk-card";

            // Header Kartu Layanan
            const header = document.createElement("header");
            header.className = "kiosk-card-header";
            header.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <h2 class="kiosk-card-title">${esc(layanan.nama)}</h2>
                    <span class="kiosk-status-badge">${menunggu} pasien menunggu</span>
                </div>
                <span class="kiosk-card-code">${esc(layanan.kode)}</span>
            `;
            card.appendChild(header);

            // Container Tombol Ambil Nomor
            const actions = document.createElement("div");

            // Tombol Utama: Ambil Nomor Reguler
            const btnNormal = document.createElement("button");
            btnNormal.type = "button";
            btnNormal.className = "btn-ambil-normal";
            btnNormal.innerHTML = `
                <span class="btn-main-text">Ambil Tiket Reguler</span>
                <span class="btn-sub-label">Pasien Umum</span>
            `;
            btnNormal.addEventListener("click", () => ambilTiket(layanan, "Normal"));
            actions.appendChild(btnNormal);

            // Divider Pemisah Opsi Khusus (tanpa panah membingungkan)
            const priorityDivider = document.createElement("div");
            priorityDivider.className = "kiosk-priority-divider";
            priorityDivider.innerHTML = `<span>Jalur Prioritas Khusus</span>`;
            actions.appendChild(priorityDivider);

            // Grid Tombol Prioritas: Lansia, Disabilitas, VIP
            const priorityGrid = document.createElement("div");
            priorityGrid.className = "kiosk-priority-grid";

            const opsiPrioritas: { nama: Prioritas; label: string; kelas: string }[] = [
                { nama: "Lansia", label: "Lansia", kelas: "prio-lansia" },
                { nama: "Disabilitas", label: "Disabilitas", kelas: "prio-disabilitas" },
                { nama: "VIP", label: "VIP", kelas: "prio-vip" }
            ];

            opsiPrioritas.forEach(opt => {
                const btnPrio = document.createElement("button");
                btnPrio.type = "button";
                btnPrio.className = `btn-ambil-prioritas ${opt.kelas}`;
                btnPrio.textContent = opt.label;
                btnPrio.title = `Ambil tiket jalur prioritas ${opt.nama}`;
                btnPrio.addEventListener("click", () => ambilTiket(layanan, opt.nama));
                priorityGrid.appendChild(btnPrio);
            });

            actions.appendChild(priorityGrid);
            card.appendChild(actions);

            kioskContainer.appendChild(card);
        });
    }

    // --- 6. REAL-TIME AUTO POLLING & STORAGE SYNC ---
    // Auto-update daftar jenis antrian setiap 2 detik tanpa reload halaman
    window.setInterval(render, 2000);

    // Sinkronisasi seketika saat ada perubahan data di tab admin atau operator
    window.addEventListener("storage", (e: StorageEvent) => {
        if (e.key === KUNCI_LAYANAN || e.key === KUNCI_TIKET) {
            render();
        }
    });

    // Render awal saat DOM siap
    render();
});

