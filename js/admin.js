"use strict";
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. AUTH & ROLE GUARD ---
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");
    if (!token || (role !== "admin" && role !== "moderator")) {
        alert("Akses ditolak! Anda harus login sebagai Admin.");
        window.location.href = "login.html";
        return;
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
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
    // --- 2. STATE & LOCALSTORAGE INITIALIZER ---
    let daftarLayanan = JSON.parse(localStorage.getItem("daftarLayanan") || "[]");
    let daftarTiket = JSON.parse(localStorage.getItem("daftarTiket") || "[]");
    // Default data awal jika kosong agar mudah diuji
    if (daftarLayanan.length === 0) {
        daftarLayanan = [
            { id: "1", kode: "A", nama: "Poli Umum", aktif: true },
            { id: "2", kode: "B", nama: "Poli Anak", aktif: true },
            { id: "3", kode: "G", nama: "Poli Gigi", aktif: true }
        ];
        localStorage.setItem("daftarLayanan", JSON.stringify(daftarLayanan));
    }
    // --- 3. DOM ELEMENTS ---
    const layananForm = document.getElementById("layanan-form");
    const kodeInput = document.getElementById("kode-layanan");
    const namaInput = document.getElementById("nama-layanan");
    const listLayananContainer = document.getElementById("list-layanan-container");
    const resetAllBtn = document.getElementById("reset-all-btn");
    const tiketManualForm = document.getElementById("tiket-manual-form");
    const selectLayanan = document.getElementById("select-layanan");
    const selectPrioritas = document.getElementById("select-prioritas");
    const listTiketContainer = document.getElementById("list-tiket-container");
    // --- 4. RENDER FUNCTIONS ---
    function renderLayanan() {
        listLayananContainer.innerHTML = "";
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
            itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: white; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e0;";
            itemDiv.innerHTML = `
                <div>
                    <strong>${layanan.nama}</strong> [${layanan.kode}] 
                    <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: ${layanan.aktif ? '#c6f6d5' : '#fed7d7'}; color: ${layanan.aktif ? '#22543d' : '#742a2a'};">
                        ${layanan.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                    <button type="button" data-id="${layanan.id}" class="toggle-btn" style="background: #edf2f7; color: #2d3748; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        ${layanan.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button type="button" data-id="${layanan.id}" class="delete-btn" style="background: var(--danger); color: white; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        Hapus
                    </button>
                </div>
            `;
            listLayananContainer.appendChild(itemDiv);
        });
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
        listTiketContainer.innerHTML = "";
        if (daftarTiket.length === 0) {
            listTiketContainer.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">Belum ada tiket aktif.</p>`;
            return;
        }
        daftarTiket.slice(-10).reverse().forEach(tiket => {
            const ticketDiv = document.createElement("div");
            ticketDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: white; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 0.9rem;";
            ticketDiv.innerHTML = `
                <div>
                    <strong>${tiket.nomorTampil}</strong> - <span style="font-size: 0.8rem; color: var(--text-muted);">${tiket.prioritas}</span>
                </div>
                <span style="font-size: 0.75rem; font-weight: 600; color: #2b6cb0;">${tiket.status}</span>
            `;
            listTiketContainer.appendChild(ticketDiv);
        });
    }
    // --- 5. CRUD LOGIC & VALIDATION ---
    layananForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const kode = kodeInput.value.toUpperCase().trim();
        const nama = namaInput.value.trim();
        if (!kode || kode.length !== 1) {
            alert("Kode layanan harus persis 1 huruf kapital!");
            return;
        }
        // Validasi Duplikasi Case-Insensitive
        const isDuplicate = daftarLayanan.some(l => l.kode.toUpperCase() === kode);
        if (isDuplicate) {
            alert(`Kode layanan "${kode}" sudah terdaftar! Gunakan kode lain.`);
            return;
        }
        const newLayanan = {
            id: Date.now().toString(),
            kode: kode,
            nama: nama,
            aktif: true
        };
        daftarLayanan.push(newLayanan);
        localStorage.setItem("daftarLayanan", JSON.stringify(daftarLayanan));
        kodeInput.value = "";
        namaInput.value = "";
        renderLayanan();
    });
    function toggleLayanan(id) {
        if (!id)
            return;
        daftarLayanan = daftarLayanan.map(l => l.id === id ? Object.assign(Object.assign({}, l), { aktif: !l.aktif }) : l);
        localStorage.setItem("daftarLayanan", JSON.stringify(daftarLayanan));
        renderLayanan();
    }
    function deleteLayanan(id) {
        if (!id)
            return;
        if (confirm("Yakin ingin menghapus layanan ini?")) {
            daftarLayanan = daftarLayanan.filter(l => l.id !== id);
            localStorage.setItem("daftarLayanan", JSON.stringify(daftarLayanan));
            renderLayanan();
        }
    }
    // --- 6. TERBITKAN TIKET MANUAL ---
    tiketManualForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const kodeLayanan = selectLayanan.value;
        const prioritas = selectPrioritas.value;
        if (!kodeLayanan) {
            alert("Silakan pilih layanan terlebih dahulu!");
            return;
        }
        // Hitung nomor urut berikutnya berdasarkan kode layanan
        const existingForService = daftarTiket.filter(t => t.layananKode === kodeLayanan);
        const nextNumber = existingForService.length + 1;
        const formattedNumber = String(nextNumber).length === 1 ? `00${nextNumber}` : String(nextNumber).length === 2 ? `0${nextNumber}` : `${nextNumber}`;
        const nomorTampil = `${kodeLayanan}-${formattedNumber}`;
        const newTiket = {
            id: Date.now().toString(),
            layananKode: kodeLayanan,
            nomorUrut: nextNumber,
            nomorTampil: nomorTampil,
            prioritas: prioritas,
            status: "Menunggu",
            waktu: new Date().toLocaleTimeString()
        };
        daftarTiket.push(newTiket);
        localStorage.setItem("daftarTiket", JSON.stringify(daftarTiket));
        renderTiket();
        alert(`Berhasil menerbitkan tiket manual: ${nomorTampil}`);
    });
    // --- 7. RESET SELURUH ANTRIAN ---
    resetAllBtn.addEventListener("click", () => {
        if (confirm("PERINGATAN: Apakah Anda yakin ingin mereset seluruh data antrian aktif?")) {
            daftarTiket = [];
            localStorage.setItem("daftarTiket", JSON.stringify(daftarTiket));
            renderTiket();
            alert("Semua data antrian berhasil direset.");
        }
    });
    // Initial Render on Load
    renderLayanan();
    renderTiket();
});
