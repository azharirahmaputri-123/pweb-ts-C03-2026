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
    // --- 0. AUTH GUARD (REVISI SOAL: WAJIB LOGIN UNTUK SEMUA AKSES) ---
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    if (!token) {
        tampilkanModalAksesDitolak("Sesi login Anda tidak ditemukan atau telah kedaluwarsa.", "Sesuai regulasi terbaru, Anda harus masuk (login) terlebih dahulu untuk memantau layar antrian.", "login.html", "Ke Halaman Login Sekarang");
        return;
    }
    // Tampilkan info akun pengguna & tautan staf jika admin
    const firstName = localStorage.getItem("firstName") || "Pengguna";
    const userRole = (role || "user").toUpperCase();
    const userNameEl = document.getElementById("layar-user-name");
    const userRoleEl = document.getElementById("layar-user-role");
    const userAvatarEl = document.getElementById("user-avatar-initial");
    if (userNameEl)
        userNameEl.textContent = firstName;
    if (userRoleEl)
        userRoleEl.textContent = userRole;
    if (userAvatarEl)
        userAvatarEl.textContent = firstName.charAt(0).toUpperCase();
    if (role === "admin" || role === "moderator") {
        const staffNav = document.getElementById("staff-nav-group");
        if (staffNav)
            staffNav.style.display = "inline-flex";
    }
    // Tombol Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ["accessToken", "userRole", "firstName"].forEach(k => localStorage.removeItem(k));
            window.location.href = "login.html";
        });
    }
    const displayContainer = document.getElementById("display-container");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const timestampInfo = document.getElementById("timestamp-info");
    if (!displayContainer)
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
        // Sinkronisasi status tampilan penuh saat user tekan Esc atau klik tombol
        document.addEventListener("fullscreenchange", () => {
            const labelEl = document.getElementById("fullscreen-label");
            if (document.fullscreenElement) {
                if (labelEl)
                    labelEl.textContent = "Keluar Penuh";
                else
                    fullscreenBtn.textContent = "Keluar Layar Penuh";
            }
            else {
                if (labelEl)
                    labelEl.textContent = "Layar Penuh";
                else
                    fullscreenBtn.textContent = "Layar Penuh";
            }
        });
    }
    // --- 2. TIMESTAMP FORMATTER ---
    function perbaruiWaktu() {
        if (!timestampInfo)
            return;
        const skrg = new Date();
        const pad = (n) => (n < 10 ? "0" + n : String(n));
        const jam = pad(skrg.getHours());
        const menit = pad(skrg.getMinutes());
        const detik = pad(skrg.getSeconds());
        timestampInfo.textContent = `Diperbarui ${jam}.${menit}.${detik}`;
    }
    // --- 2.5. AUDIO CHIME PANGGILAN RUANG TUNGGU (LOBBY SOUND) ---
    function bunyikanChimePanggilan() {
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
                gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + delay + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + durasi);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + durasi);
            };
            // Chime lembut 2-nada (E5 ke A5) khas ruang tunggu rumah sakit
            mainkanNada(659.25, 0, 0.35);
            mainkanNada(880.00, 0.22, 0.45);
        }
        catch (_a) {
            // Browser policy mungkin menahan audio otomatis sebelum user klik layar
        }
    }
    const tiketTerakhirPerLayanan = {};
    let pertamaKaliRender = true;
    // --- 3. RENDER KARTU MONITOR LAYAR ---
    function render() {
        if (!displayContainer)
            return;
        const semuaLayanan = bacaLayanan();
        const semuaTiket = bacaTiket();
        // Tampilkan semua layanan yang aktif
        const layananAktif = semuaLayanan.filter(l => l.aktif);
        // Cek apakah ada nomor antrian baru yang baru saja dipanggil
        let adaPanggilanBaru = false;
        layananAktif.forEach(layanan => {
            const dipanggil = tiketSedangDipanggil(layanan.kode, semuaTiket);
            const idDipanggil = dipanggil ? dipanggil.id : "";
            if (!pertamaKaliRender && dipanggil && idDipanggil !== (tiketTerakhirPerLayanan[layanan.kode] || "")) {
                adaPanggilanBaru = true;
            }
            tiketTerakhirPerLayanan[layanan.kode] = idDipanggil;
        });
        if (adaPanggilanBaru) {
            bunyikanChimePanggilan();
        }
        pertamaKaliRender = false;
        displayContainer.replaceChildren();
        if (layananAktif.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "empty-state-info";
            emptyEl.innerHTML = `
                <h3>Belum Ada Layanan Aktif</h3>
                <p>Silakan aktifkan atau tambahkan jenis antrian melalui Dashboard Admin.</p>
            `;
            displayContainer.appendChild(emptyEl);
            perbaruiWaktu();
            return;
        }
        layananAktif.forEach(layanan => {
            const dipanggil = tiketSedangDipanggil(layanan.kode, semuaTiket);
            const menunggu = jumlahMenunggu(layanan.kode, semuaTiket);
            const card = document.createElement("article");
            card.className = `display-card ${dipanggil ? "is-calling" : ""}`;
            // Header Kartu: Nama Layanan & Badge Kode
            const header = document.createElement("header");
            header.className = "display-card-header";
            header.innerHTML = `
                <h2 class="display-card-title">${esc(layanan.nama)}</h2>
                <span class="display-card-code">${esc(layanan.kode)}</span>
            `;
            card.appendChild(header);
            // Body Kartu: Nomor Sedang Dipanggil atau Status Kosong
            const body = document.createElement("div");
            body.className = "display-card-body";
            if (dipanggil) {
                body.innerHTML = `
                    <span class="calling-badge">
                        <span class="calling-dot"></span>
                        DIPANGGIL
                    </span>
                    <div class="display-number">${esc(dipanggil.nomorTampil)}</div>
                `;
            }
            else {
                body.innerHTML = `
                    <div class="display-empty-title">Belum ada nomor dipanggil</div>
                    <div class="display-empty-desc">Nomor akan muncul setelah operator memanggil tiket.</div>
                `;
            }
            card.appendChild(body);
            // Footer Kartu: Jumlah Tiket Tersisa dalam Antrean
            const footer = document.createElement("footer");
            footer.className = "display-card-footer";
            footer.innerHTML = `
                <span>${menunggu} tiket menunggu</span>
            `;
            card.appendChild(footer);
            displayContainer.appendChild(card);
        });
        perbaruiWaktu();
    }
    // --- 4. REAL-TIME AUTO POLLING & STORAGE SYNC ---
    // Auto-polling setiap 2 detik (tanpa reload halaman)
    window.setInterval(render, 2000);
    // Sinkronisasi seketika saat ada perubahan data di tab lain
    window.addEventListener("storage", (e) => {
        if (e.key === KUNCI_TIKET || e.key === KUNCI_LAYANAN) {
            render();
        }
    });
    // Render awal saat DOM siap
    render();
});
