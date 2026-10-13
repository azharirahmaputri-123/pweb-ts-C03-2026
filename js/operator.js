"use strict";
document.addEventListener("DOMContentLoaded", () => {
    var _a, _b;
    // --- 1. AUTH & ROLE GUARD DENGAN POP-UP MODAL ---
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    if (!token) {
        tampilkanModalAksesDitolak("Sesi login Anda tidak ditemukan atau telah kedaluwarsa.", "Anda harus masuk dengan kredensial Administrator atau Moderator untuk mengoperasikan antrian.", "login.html", "Ke Halaman Login Sekarang");
        return;
    }
    if (role !== "admin" && role !== "moderator") {
        tampilkanModalAksesDitolak(`Akun Anda terdaftar dengan hak akses "${(role || "user").toUpperCase()}".`, "Panel Operator hanya dapat diakses dan dioperasikan oleh Administrator atau Moderator Rumah Sakit.", "ambil-antrian.html", "Buka Halaman Ambil Antrian", { url: "login.html", label: "Login Akun Lain" });
        return;
    }
    const kontainer = document.getElementById("operator-panels-container");
    const logoutBtn = document.getElementById("logout-btn");
    const suaraBtn = document.getElementById("suara-btn");
    if (!kontainer)
        return;
    const firstName = (_a = localStorage.getItem("firstName")) !== null && _a !== void 0 ? _a : "Operator";
    const userRole = ((_b = localStorage.getItem("userRole")) !== null && _b !== void 0 ? _b : "ADMIN").toUpperCase();
    const namaPengguna = document.getElementById("operator-name");
    const rolePengguna = document.getElementById("operator-role");
    const avatarEl = document.getElementById("user-avatar-initial");
    if (namaPengguna)
        namaPengguna.textContent = firstName;
    if (rolePengguna)
        rolePengguna.textContent = userRole;
    if (avatarEl)
        avatarEl.textContent = firstName.charAt(0).toUpperCase();
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ["accessToken", "userRole", "firstName"].forEach(k => localStorage.removeItem(k));
            window.location.href = "login.html";
        });
    }
    // SUARA PANGGILAN (Web Speech API) 
    const KUNCI_SUARA = "suaraAktif";
    let suaraAktif = localStorage.getItem(KUNCI_SUARA) !== "0";
    const suaraLabel = document.getElementById("suara-label");
    function perbaruiTombolSuara() {
        if (!suaraBtn)
            return;
        const teks = suaraAktif ? "Suara: Aktif" : "Suara: Mati";
        if (suaraLabel) {
            suaraLabel.textContent = teks;
        }
        else {
            suaraBtn.textContent = teks;
        }
        suaraBtn.setAttribute("aria-pressed", String(suaraAktif));
    }
    if (suaraBtn) {
        suaraBtn.addEventListener("click", () => {
            suaraAktif = !suaraAktif;
            localStorage.setItem(KUNCI_SUARA, suaraAktif ? "1" : "0");
            if (!suaraAktif && "speechSynthesis" in window)
                window.speechSynthesis.cancel();
            perbaruiTombolSuara();
        });
    }
    perbaruiTombolSuara();
    function umumkan(tiket, namaLayanan) {
        if (!suaraAktif || !("speechSynthesis" in window))
            return;
        const synth = window.speechSynthesis;
        synth.cancel(); // hentikan panggilan sebelumnya agar tidak menumpuk
        const teks = `Nomor antrian ${tiket.layananKode} ${tiket.nomorUrut}, silakan menuju ${namaLayanan}`;
        const ucapan = new SpeechSynthesisUtterance(teks);
        ucapan.lang = "id-ID";
        ucapan.rate = 0.9;
        const suaraIndonesia = synth.getVoices().find(v => v.lang.toLowerCase().startsWith("id"));
        if (suaraIndonesia)
            ucapan.voice = suaraIndonesia;
        synth.speak(ucapan);
    }
    // RENDER
    function buatEl(tag, kelas, teks) {
        const el = document.createElement(tag);
        if (kelas)
            el.className = kelas;
        if (teks !== undefined)
            el.textContent = teks;
        return el;
    }
    function buatBlokNomor(label, nomor, keterangan, isHighlight = false) {
        const blok = buatEl("div", `op-blok ${isHighlight ? "blok-dipanggil" : ""}`);
        blok.appendChild(buatEl("span", "op-label", label));
        blok.appendChild(buatEl("strong", "op-nomor", nomor));
        if (keterangan)
            blok.appendChild(buatEl("span", "op-keterangan", keterangan));
        return blok;
    }
    function buatTombol(teks, kelas, aktif, aksi) {
        const tombol = buatEl("button", kelas, teks);
        tombol.type = "button";
        tombol.disabled = !aktif;
        tombol.addEventListener("click", aksi);
        return tombol;
    }
    function buatKartu(layanan, semua) {
        const dipanggil = tiketSedangDipanggil(layanan.kode, semua);
        const berikut = tiketBerikutnya(layanan.kode, semua);
        const menunggu = jumlahMenunggu(layanan.kode, semua);
        const kartu = buatEl("article", "operator-card");
        const kepala = buatEl("header", "op-kepala");
        const judul = buatEl("h3", "op-judul", `${layanan.nama} [${layanan.kode}]`);
        if (!layanan.aktif)
            judul.appendChild(buatEl("span", "op-badge", "Nonaktif"));
        kepala.appendChild(judul);
        kepala.appendChild(buatEl("span", "op-menunggu", `${menunggu} menunggu`));
        kartu.appendChild(kepala);
        const isi = buatEl("div", "op-isi");
        isi.appendChild(buatBlokNomor("Sedang dipanggil", dipanggil ? dipanggil.nomorTampil : "-", dipanggil ? "Sedang melayani" : "Belum ada panggilan", dipanggil !== null));
        isi.appendChild(buatBlokNomor("Berikutnya", berikut ? berikut.nomorTampil : "-", berikut ? `Prioritas: ${berikut.prioritas}` : "Antrian kosong", false));
        kartu.appendChild(isi);
        const kontrolGrup = buatEl("div", "op-kontrol-grup");
        // 1. Tombol Utama: Panggil Berikutnya
        const teksPanggil = berikut ? `Panggil Berikutnya (${berikut.nomorTampil})` : "Panggil Berikutnya";
        kontrolGrup.appendChild(buatTombol(teksPanggil, "btn-panggil-utama", berikut !== null, () => {
            const baru = panggilBerikutnya(layanan.kode);
            if (baru)
                umumkan(baru, layanan.nama);
            render();
        }));
        // 2. Kontrol Pasien Saat Ini: Selesai, Lewati, Panggil Ulang Suara
        const subAksi = buatEl("div", "op-sub-aksi");
        subAksi.appendChild(buatTombol("Selesai", "btn-op-selesai", dipanggil !== null, () => {
            selesaikanTiket(layanan.kode);
            render();
        }));
        subAksi.appendChild(buatTombol("Lewati", "btn-op-lewati", dipanggil !== null, () => {
            lewatiTiket(layanan.kode);
            render();
        }));
        subAksi.appendChild(buatTombol("Panggil Ulang", "btn-op-ulang", dipanggil !== null, () => {
            if (dipanggil)
                umumkan(dipanggil, layanan.nama);
        }));
        kontrolGrup.appendChild(subAksi);
        kartu.appendChild(kontrolGrup);
        if (berikut === null && dipanggil === null) {
            kartu.appendChild(buatEl("p", "op-info", "Antrian kosong. Tidak ada tiket menunggu."));
        }
        return kartu;
    }
    function render() {
        if (!kontainer)
            return;
        const semua = bacaTiket();
        const tampil = bacaLayanan().filter(l => l.aktif || jumlahMenunggu(l.kode, semua) > 0 || tiketSedangDipanggil(l.kode, semua) !== null);
        kontainer.replaceChildren();
        if (tampil.length === 0) {
            kontainer.appendChild(buatEl("p", "op-info", "Belum ada jenis antrian aktif."));
            return;
        }
        tampil.forEach(l => kontainer.appendChild(buatKartu(l, semua)));
    }
    // SINKRONISASI
    window.addEventListener("storage", (e) => {
        if (e.key === KUNCI_TIKET || e.key === KUNCI_LAYANAN)
            render();
    });
    window.setInterval(render, 2000);
    render();
});
