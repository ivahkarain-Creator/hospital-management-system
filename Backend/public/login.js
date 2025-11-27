document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const loginId = document.getElementById("loginId").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("errorMessage");

  // Clear previous errors
  errorBox.textContent = "";

  if (!loginId || !password) {
    errorBox.textContent = "Please fill all fields.";
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password })
    });

    if (!response.ok) {
      errorBox.textContent = "Server error. Try again later.";
      return;
    }

    const result = await response.json();

    if (!result.success) {
      errorBox.textContent = result.message;
      return;
    }

    // Save user info in localStorage
    localStorage.setItem("loggedInUser", JSON.stringify(result));

    // Redirect based on role
    const role = result.role.toLowerCase();
    if (role === "admin") {
      window.location.href = "admin_dashboard.html";
    } else if (role === "doctor" || role === "nurse") {
      window.location.href = "staff_dashboard.html";
    } else {
      errorBox.textContent = "Unknown role. Contact administrator.";
    }

  } catch (err) {
    console.error("Login error:", err);
    errorBox.textContent = "Server error. Please try again later.";
  }
});
