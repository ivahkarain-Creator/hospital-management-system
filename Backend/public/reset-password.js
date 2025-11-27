document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const email = urlParams.get("email");

  if (!token || !email) {
    alert("Invalid password reset link.");
    return;
  }

  const form = document.getElementById("resetForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!newPassword || !confirmPassword) {
      alert("Please fill both fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword })
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        window.location.href = "login.html"; // redirect to login
      }

    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    }
  });
});
