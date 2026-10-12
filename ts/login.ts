interface LoginResponse {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    image: string;
    accessToken: string;
    message?: string;
}

interface MeResponse {
    role: string;
}

function redirectByRole(role: string): void {
    if (role === "admin" || role === "moderator") {
        window.location.href = "index.html";
    } else {
        window.location.href = "operator.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form") as HTMLFormElement;
    const usernameInput = document.getElementById("username") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    const errorMessage = document.getElementById("error-message") as HTMLElement;
    const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;

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

    loginForm.addEventListener("submit", async (e: Event) => {
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
            const response = await fetch("https://dummyjson.com/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    expiresInMins: 60,
                }),
            });

            const data: LoginResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Gagal melakukan login. Periksa kembali username/password.");
            }

            const meRes = await fetch("https://dummyjson.com/auth/me", {
                headers: { Authorization: `Bearer ${data.accessToken}` },
            });
            if (!meRes.ok) {
                throw new Error("Gagal mengambil data pengguna.");
            }
            const me: MeResponse = await meRes.json();
            if (!me.role) {
                throw new Error("Role pengguna tidak ditemukan.");
            }

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("firstName", data.firstName);
            localStorage.setItem("userRole", me.role);

            redirectByRole(me.role);

        } catch (error: unknown) {
            if (error instanceof TypeError) {
                errorMessage.textContent = "Koneksi jaringan gagal. Periksa internet.";
            } else if (error instanceof Error) {
                errorMessage.textContent = error.message;
            } else {
                errorMessage.textContent = "Terjadi kesalahan.";
            }
            loginBtn.textContent = "Masuk";
            loginBtn.removeAttribute("disabled");
        }
    });
});