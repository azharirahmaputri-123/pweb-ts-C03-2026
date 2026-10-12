document.addEventListener("DOMContentLoaded", () => {
    // AUTH GUARD
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const kontainer = document.getElementById("operator-panels-container");
    const logoutBtn = document.getElementById("logout-btn");
    const suaraBtn = document.getElementById("suara-btn");
    const namaPengguna = document.getElementById("operator-name");
    if (!kontainer) return;

    if (namaPengguna) {
        const role = localStorage.getItem("userRole") ?? "";
        namaPengguna.textContent = `${localStorage.getItem("firstName") ?? "Operator"} (${role})`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ["accessToken", "userRole", "firstName"].forEach(k => localStorage.removeItem(k));
            window.location.href = "login.html";
        });
    }

    // SUARA PANGGILAN (Web Speech API) 
    const KUNCI_SUARA = "suaraAktif";
    let suaraAktif = localStorage.getItem(KUNCI_SUARA) !== "0";

    function perbaruiTombolSuara(): void {
        if (!suaraBtn) return;
        suaraBtn.textContent = suaraAktif ? "Suara: Aktif" : "Suara: Mati";
        suaraBtn.setAttribute("aria-pressed", String(suaraAktif));
    }

    if (suaraBtn) {
        suaraBtn.addEventListener("click", () => {
            suaraAktif = !suaraAktif;
            localStorage.setItem(KUNCI_SUARA, suaraAktif ? "1" : "0");
            if (!suaraAktif && "speechSynthesis" in window) window.speechSynthesis.cancel();
            perbaruiTombolSuara();
        });
    }
    perbaruiTombolSuara();

    function umumkan(tiket: Tiket, namaLayanan: string): void {
        if (!suaraAktif || !("speechSynthesis" in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel(); // hentikan panggilan sebelumnya agar tidak menumpuk

        const teks = `Nomor antrian ${tiket.layananKode} ${tiket.nomorUrut}, silakan menuju ${namaLayanan}`;
        const ucapan = new SpeechSynthesisUtterance(teks);
        ucapan.lang = "id-ID";
        ucapan.rate = 0.9;
        const suaraIndonesia = synth.getVoices().find(v => v.lang.toLowerCase().startsWith("id"));
        if (suaraIndonesia) ucapan.voice = suaraIndonesia;
        synth.speak(ucapan);
    }

    // RENDER
    function buatEl<K extends keyof HTMLElementTagNameMap>(
        tag: K, kelas?: string, teks?: string
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (kelas) el.className = kelas;
        if (teks !== undefined) el.textContent = teks;
        return el;
    }

    function buatBlokNomor(label: string, nomor: string, keterangan?: string, isHighlight: boolean = false): HTMLDivElement {
        const blok = buatEl("div", `op-blok ${isHighlight ? "blok-dipanggil" : ""}`);
        blok.appendChild(buatEl("span", "op-label", label));
        blok.appendChild(buatEl("strong", "op-nomor", nomor));
        if (keterangan) blok.appendChild(buatEl("span", "op-keterangan", keterangan));
        return blok;
    }

    function buatTombol(teks: string, kelas: string, aktif: boolean, aksi: () => void): HTMLButtonElement {
        const tombol = buatEl("button", kelas, teks);
        tombol.type = "button";
        tombol.disabled = !aktif;
        tombol.addEventListener("click", aksi);
        return tombol;
    }

    function buatKartu(layanan: Layanan, semua: Tiket[]): HTMLElement {
        const dipanggil = tiketSedangDipanggil(layanan.kode, semua);
        const berikut = tiketBerikutnya(layanan.kode, semua);
        const menunggu = jumlahMenunggu(layanan.kode, semua);

        const kartu = buatEl("article", "operator-card");

        const kepala = buatEl("header", "op-kepala");
        const judul = buatEl("h3", "op-judul", `${layanan.nama} [${layanan.kode}]`);
        if (!layanan.aktif) judul.appendChild(buatEl("span", "op-badge", "Nonaktif"));
        kepala.appendChild(judul);
        kepala.appendChild(buatEl("span", "op-menunggu", `${menunggu} menunggu`));
        kartu.appendChild(kepala);

        const isi = buatEl("div", "op-isi");
        isi.appendChild(buatBlokNomor(
            "Sedang dipanggil",
            dipanggil ? dipanggil.nomorTampil : "-",
            dipanggil ? "Sedang melayani" : "Belum ada panggilan",
            dipanggil !== null
        ));
        isi.appendChild(buatBlokNomor(
            "Berikutnya",
            berikut ? berikut.nomorTampil : "-",
            berikut ? `Prioritas: ${berikut.prioritas}` : "Antrian kosong",
            false
        ));
        kartu.appendChild(isi);

        const aksi = buatEl("div", "op-aksi");
        aksi.appendChild(buatTombol("Panggil Berikutnya", "btn-panggil", berikut !== null, () => {
            const baru = panggilBerikutnya(layanan.kode);
            if (baru) umumkan(baru, layanan.nama);
            render();
        }));
        aksi.appendChild(buatTombol("Lewati", "btn-sekunder", dipanggil !== null, () => {
            lewatiTiket(layanan.kode);
            render();
        }));
        aksi.appendChild(buatTombol("Selesai", "btn-sekunder", dipanggil !== null, () => {
            selesaikanTiket(layanan.kode);
            render();
        }));
        kartu.appendChild(aksi);

        if (dipanggil) {
            const ulang = buatTombol("Ulangi Panggilan Suara", "btn-tautan", true, () => {
                umumkan(dipanggil, layanan.nama);
            });
            kartu.appendChild(ulang);
        }
        if (berikut === null) {
            kartu.appendChild(buatEl("p", "op-info", "Tidak ada tiket menunggu untuk jenis antrian ini."));
        }
        return kartu;
    }

    function render(): void {
        if (!kontainer) return;
        const semua = bacaTiket();
        const tampil = bacaLayanan().filter(l =>
            l.aktif || jumlahMenunggu(l.kode, semua) > 0 || tiketSedangDipanggil(l.kode, semua) !== null
        );

        kontainer.replaceChildren();
        if (tampil.length === 0) {
            kontainer.appendChild(buatEl("p", "op-info", "Belum ada jenis antrian aktif."));
            return;
        }
        tampil.forEach(l => kontainer.appendChild(buatKartu(l, semua)));
    }

    // SINKRONISASI
    window.addEventListener("storage", (e: StorageEvent) => {
        if (e.key === KUNCI_TIKET || e.key === KUNCI_LAYANAN) render();
    });
    window.setInterval(render, 2000);

    render();
});