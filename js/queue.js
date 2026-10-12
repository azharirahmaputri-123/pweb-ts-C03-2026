"use strict";
/* TIPE & KONSTANTA BERSAMA */
const PRIORITAS = ["Normal", "Lansia", "Disabilitas", "VIP"];
const STATUS_TIKET = ["Menunggu", "Dipanggil", "Selesai", "Lewati"];
const KUNCI_LAYANAN = "daftarLayanan";
const KUNCI_TIKET = "daftarTiket";
const LAYANAN_AWAL = [
    { id: "1", kode: "A", nama: "Poli Umum", aktif: true },
    { id: "2", kode: "B", nama: "Poli Anak", aktif: true },
    { id: "3", kode: "G", nama: "Poli Gigi", aktif: true },
];
function isPrioritas(v) {
    return PRIORITAS.includes(v);
}
function isStatusTiket(v) {
    return STATUS_TIKET.includes(v);
}
function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/* LOCAL STORAGE (DIVALIDASI) */
function isRecord(v) {
    return typeof v === "object" && v !== null;
}
function isLayanan(v) {
    return isRecord(v)
        && typeof v.id === "string"
        && typeof v.kode === "string"
        && typeof v.nama === "string"
        && typeof v.aktif === "boolean";
}
function isTiket(v) {
    return isRecord(v)
        && typeof v.id === "string"
        && typeof v.layananKode === "string"
        && typeof v.nomorUrut === "number"
        && typeof v.nomorTampil === "string"
        && typeof v.prioritas === "string" && isPrioritas(v.prioritas)
        && typeof v.status === "string" && isStatusTiket(v.status)
        && typeof v.waktu === "string";
}
function bacaDaftar(kunci, guard) {
    const mentah = localStorage.getItem(kunci);
    if (mentah === null)
        return null;
    try {
        const hasil = JSON.parse(mentah);
        return Array.isArray(hasil) ? hasil.filter(guard) : [];
    }
    catch (_a) {
        return [];
    }
}
function bacaLayanan() {
    const data = bacaDaftar(KUNCI_LAYANAN, isLayanan);
    if (data === null) {
        simpanLayanan(LAYANAN_AWAL);
        return LAYANAN_AWAL.slice();
    }
    return data;
}
function simpanLayanan(daftar) {
    localStorage.setItem(KUNCI_LAYANAN, JSON.stringify(daftar));
}
function bacaTiket() {
    var _a;
    return (_a = bacaDaftar(KUNCI_TIKET, isTiket)) !== null && _a !== void 0 ? _a : [];
}
function simpanTiket(daftar) {
    localStorage.setItem(KUNCI_TIKET, JSON.stringify(daftar));
}
/* PENOMORAN TIKET */
function formatNomorUrut(n) {
    let s = String(n);
    while (s.length < 3)
        s = "0" + s;
    return s;
}
function formatNomorTiket(kode, urut) {
    return `${kode}-${formatNomorUrut(urut)}`;
}
function terbitkanTiket(kode, prioritas) {
    const semua = bacaTiket();
    let terbesar = 0;
    for (const t of semua) {
        if (t.layananKode === kode && t.nomorUrut > terbesar)
            terbesar = t.nomorUrut;
    }
    const urut = terbesar + 1;
    const tiket = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        layananKode: kode,
        nomorUrut: urut,
        nomorTampil: formatNomorTiket(kode, urut),
        prioritas,
        status: "Menunggu",
        waktu: new Date().toLocaleTimeString(),
    };
    semua.push(tiket);
    simpanTiket(semua);
    return tiket;
}
function resetAntrian() {
    simpanTiket([]);
}
/* ALGORITMA PRIORITAS */
const BOBOT_PRIORITAS = {
    VIP: 0,
    Disabilitas: 1,
    Lansia: 2,
    Normal: 3,
};
function bandingkanTiket(a, b) {
    const selisih = BOBOT_PRIORITAS[a.prioritas] - BOBOT_PRIORITAS[b.prioritas];
    return selisih !== 0 ? selisih : a.nomorUrut - b.nomorUrut;
}
function daftarMenunggu(kode, semua = bacaTiket()) {
    return semua
        .filter(t => t.layananKode === kode && t.status === "Menunggu")
        .sort(bandingkanTiket);
}
function tiketBerikutnya(kode, semua = bacaTiket()) {
    var _a;
    return (_a = daftarMenunggu(kode, semua)[0]) !== null && _a !== void 0 ? _a : null;
}
function tiketSedangDipanggil(kode, semua = bacaTiket()) {
    var _a;
    return (_a = semua.find(t => t.layananKode === kode && t.status === "Dipanggil")) !== null && _a !== void 0 ? _a : null;
}
function jumlahMenunggu(kode, semua = bacaTiket()) {
    return daftarMenunggu(kode, semua).length;
}
/* AKSI OPERATOR */
function panggilBerikutnya(kode) {
    var _a;
    const semua = bacaTiket();
    const berikut = tiketBerikutnya(kode, semua);
    const baru = semua.map((t) => {
        if (t.layananKode === kode && t.status === "Dipanggil") {
            return Object.assign(Object.assign({}, t), { status: "Selesai" });
        }
        if (berikut !== null && t.id === berikut.id) {
            return Object.assign(Object.assign({}, t), { status: "Dipanggil", dipanggilPada: Date.now() });
        }
        return t;
    });
    simpanTiket(baru);
    return berikut === null ? null : ((_a = baru.find(t => t.id === berikut.id)) !== null && _a !== void 0 ? _a : null);
}
function lewatiTiket(kode) {
    return ubahStatusDipanggil(kode, "Lewati");
}
function selesaikanTiket(kode) {
    return ubahStatusDipanggil(kode, "Selesai");
}
function ubahStatusDipanggil(kode, statusBaru) {
    const semua = bacaTiket();
    let berubah = false;
    const baru = semua.map((t) => {
        if (t.layananKode === kode && t.status === "Dipanggil") {
            berubah = true;
            return Object.assign(Object.assign({}, t), { status: statusBaru });
        }
        return t;
    });
    if (berubah)
        simpanTiket(baru);
    return berubah;
}
