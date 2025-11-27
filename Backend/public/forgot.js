document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const input = document.getElementById("username").value.trim();
  if (!input) {
    alert("Please enter your email or username.");
    return;
  }

  try {
    const payload = input.includes("@") 
      ? { email: input, username: "" } 
      : { email: "", username: input };

    const res = await fetch("http://localhost:3000/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    alert(data.message);

  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again.");
  }
});
