// Credentials
const ADMIN_USER = "harshit porwal";
const ADMIN_PASS = "1234";

// Page Load Guard: Agar pehle se logged in ho toh direct admin dashboard bhejo
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("luxe_admin_authenticated") === "true") {
    window.location.href = "admin.html";
  }
});

function handleLogin(event) {
  event.preventDefault();

  const userInput = document.getElementById("username").value.trim();
  const passInput = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-message");

  // Username case-insensitive check (harshit porwal / Harshit Porwal dono chalega)
  if (userInput.toLowerCase() === ADMIN_USER.toLowerCase() && passInput === ADMIN_PASS) {
    sessionStorage.setItem("luxe_admin_authenticated", "true");
    sessionStorage.setItem("luxe_admin_name", "Harshit Porwal");
    window.location.href = "admin.html";
  } else {
    errorMsg.style.display = "block";
  }
}