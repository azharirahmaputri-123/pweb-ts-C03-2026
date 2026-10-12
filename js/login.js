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
function redirectByRole(role) {
    if (role === "admin" || role === "moderator") {
        window.location.href = "index.html";
    }
    else {
        window.location.href = "operator.html";
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const loginBtn = document.getElementById("login-btn");
    // Toggle Show/Hide Password
    const togglePasswordBtn = document.getElementById("toggle-password-btn");
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", () => {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            togglePasswordBtn.textContent = type === "password" ? "👁️" : "🙈";
        });
    }
    // Jika sudah login, langsung lempar ke halaman admin
    const token = localStorage.getItem("accessToken");
    const savedRole = localStorage.getItem("userRole");
    if (token && savedRole) {
        redirectByRole(savedRole);
        return;
    }
    loginForm.addEventListener("submit", (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        errorMessage.textContent = "";
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        if (!username || !password) {
            errorMessage.textContent = "Username dan password wajib diisi!";
            return;
        }
        // Bonus/UI Polish: Loading state pada tombol
        loginBtn.textContent = "Memproses...";
        loginBtn.setAttribute("disabled", "true");
        try {
            const response = yield fetch("https://dummyjson.com/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    expiresInMins: 60,
                }),
            });
            const data = yield response.json();
            if (!response.ok) {
                throw new Error(data.message || "Gagal melakukan login. Periksa kembali username/password.");
            }
            const meRes = yield fetch("https://dummyjson.com/auth/me", {
                headers: { Authorization: `Bearer ${data.accessToken}` },
            });
            if (!meRes.ok) {
                throw new Error("Gagal mengambil data pengguna.");
            }
            const me = yield meRes.json();
            if (!me.role) {
                throw new Error("Role pengguna tidak ditemukan.");
            }
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("firstName", data.firstName);
            localStorage.setItem("userRole", me.role);
            redirectByRole(me.role);
        }
        catch (error) {
            if (error instanceof TypeError) {
                errorMessage.textContent = "Koneksi jaringan gagal. Periksa internet.";
            }
            else if (error instanceof Error) {
                errorMessage.textContent = error.message;
            }
            else {
                errorMessage.textContent = "Terjadi kesalahan.";
            }
            loginBtn.textContent = "Masuk";
            loginBtn.removeAttribute("disabled");
        }
    }));
});
