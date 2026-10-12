interface LoginResponse {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    image: string;
    token: string;
    role?: string; 
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
    const role = localStorage.getItem("userRole");
    if (token && (role === "admin" || role === "moderator" || role === "operator")) {
        window.location.href = "index.html";
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Gagal melakukan login. Periksa kembali username/password.");
            }

            // Simpan data sesi ke Local Storage
            localStorage.setItem("accessToken", data.token);
            localStorage.setItem("firstName", data.firstName || username);
            
            // Simulasi penentuan role: jika dummyjson tidak kirim role, set default 'admin' untuk testing
            // Ketentuan: Role moderator disamakan hak aksesnya dengan admin
            let assignedRole = data.role ? data.role.toLowerCase() : "admin";
            if (assignedRole === "moderator") {
                assignedRole = "admin";
            }
            localStorage.setItem("userRole", assignedRole);

            // Redirect berdasarkan role
            if (assignedRole === "admin") {
                window.location.href = "index.html";
            } else if (assignedRole === "operator") {
                window.location.href = "operator.html";
            } else {
                window.location.href = "layar.html";
            }

        } catch (error: any) {
            errorMessage.textContent = error.message || "Terjadi kesalahan jaringan.";
            loginBtn.textContent = "Masuk";
            loginBtn.removeAttribute("disabled");
        }
    });
});