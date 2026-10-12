"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
document.addEventListener("DOMContentLoaded", () => {
    const kioskContainer = document.getElementById("kiosk-container");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const modalContainer = document.getElementById("ticket-modal-container");
    if (!kioskContainer)
        return;
    // --- 1. FULLSCREEN API HANDLER ---
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!document.fullscreenElement) {
                    yield document.documentElement.requestFullscreen();
                }
                else {
                    yield document.exitFullscreen();
                }
            }
            catch (err) {
                console.warn("Fullscreen toggle gagal:", err);
            }
        }));
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                fullscreenBtn.textContent = "Keluar Layar Penuh";
            }
            else {
                fullscreenBtn.textContent = "Layar Penuh";
            }
        });
    }
    // --- 2. AUDIO EFFECT (NATIVE WEB AUDIO API) ---
    // Memberikan feedback audio bel/chime lembut saat tiket dicetak
    function bunyikanChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx)
                return;
            const ctx = new AudioCtx();
            const mainkanNada = (freq, delay, durasi) => {
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
        }
        catch (_a) {
            // Abaikan jika browser membatasi autoplay
        }
    }
    // --- 3. MODAL DIALOG STRUK TIKET DIGITAL ---
    let timerTutupModal = null;
    function tutupModal() {
        if (!modalContainer)
            return;
        modalContainer.replaceChildren();
        if (timerTutupModal !== null) {
            window.clearTimeout(timerTutupModal);
            timerTutupModal = null;
        }
    }
    function tampilkanModalTiket(layanan, tiket) {
        if (!modalContainer)
            return;
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
        const btnClose = receipt.querySelector("#btn-close-receipt");
        if (btnClose) {
            btnClose.addEventListener("click", tutupModal);
        }
        // Tombol cetak fisik (opsional browser print)
        const btnPrint = receipt.querySelector("#btn-print-receipt");
        if (btnPrint) {
            btnPrint.addEventListener("click", () => {
                window.print();
            });
        }
        // Klik di luar kartu receipt juga menutup modal
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay)
                tutupModal();
        });
        // Bunyikan chime & set timer otomatis tutup setelah 5 detik
        bunyikanChime();
        timerTutupModal = window.setTimeout(tutupModal, 5000);
    }
    // --- 4. AKSI AMBIL TIKET ---
    function ambilTiket(layanan, prioritas) {
        const tiketBaru = terbitkanTiket(layanan.kode, prioritas);
        tampilkanModalTiket(layanan, tiketBaru);
        render(); // Langsung perbarui jumlah antrean di kartu kiosk
    }
    // --- 5. RENDER KARTU KIOSK SELF-SERVICE ---
    function render() {
        if (!kioskContainer)
            return;
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
            // Tombol Utama: Ambil Nomor (Normal)
            const btnNormal = document.createElement("button");
            btnNormal.type = "button";
            btnNormal.className = "btn-ambil-normal";
            btnNormal.textContent = "Ambil Nomor";
            btnNormal.addEventListener("click", () => ambilTiket(layanan, "Normal"));
            actions.appendChild(btnNormal);
            // Label Opsi Prioritas
            const priorityLabel = document.createElement("div");
            priorityLabel.className = "kiosk-priority-label";
            priorityLabel.textContent = "▾ Ambil dengan prioritas";
            actions.appendChild(priorityLabel);
            // Grid Tombol Prioritas: Lansia, Disabilitas, VIP
            const priorityGrid = document.createElement("div");
            priorityGrid.className = "kiosk-priority-grid";
            const opsiPrioritas = ["Lansia", "Disabilitas", "VIP"];
            opsiPrioritas.forEach(prio => {
                const btnPrio = document.createElement("button");
                btnPrio.type = "button";
                btnPrio.className = "btn-ambil-prioritas";
                btnPrio.textContent = prio;
                btnPrio.addEventListener("click", () => ambilTiket(layanan, prio));
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
    window.addEventListener("storage", (e) => {
        if (e.key === KUNCI_LAYANAN || e.key === KUNCI_TIKET) {
            render();
        }
    });
    // Render awal saat DOM siap
    render();
});
