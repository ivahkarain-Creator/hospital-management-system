

//Accepting submition of data from the sign up menu
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const email = document.getElementById("email").value;
  const role = document.getElementById("role").value;

  try {
    const response = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email, role })
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ " + data.message);
      window.location.href = "login.html";
    } else {
      alert("⚠️ " + data.message);
    }
  } catch (err) {
    alert("🚫 Server not responding.");
    console.error("Signup fetch error:", err);
  }
});
