document.addEventListener("DOMContentLoaded", () => {
  const idField = document.getElementById("id");
  const userID = document.getElementById("userid");
  const fullname = document.getElementById("fullname");
  const age = document.getElementById("age");
  const gender = document.getElementById("gender");
  const role = document.getElementById("role");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const email = document.getElementById("email");
  const contact = document.getElementById("contact");

  const saveBtn = document.getElementById("saveBtn");
  const updateBtn = document.getElementById("updateBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const tableBody = document.querySelector("#usersTable tbody");

  // 🌟 Auto-generate UserID when role changes
  role.addEventListener("change", async () => {
    if (!role.value) return;
    try {
      const res = await fetch("http://localhost:3000/users");
      const users = await res.json();

      const roleUsers = users.filter(u => u.role === role.value);
      let maxNum = 0;

      roleUsers.forEach(u => {
        const num = parseInt((u.userID || "").replace(/\D/g, "")) || 0;
        if (num > maxNum) maxNum = num;
      });

      const prefix = role.value === "Doctor" ? "DOC" :
                     role.value === "Nurse" ? "NUR" : "ADM";

      userID.value = `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
    } catch (err) {
      console.error("Error generating UserID:", err);
    }
  });

  // 📌 Load users into table
  async function loadUsers() {
    try {
      const res = await fetch("http://localhost:3000/users");
      const users = await res.json();

      tableBody.innerHTML = "";
      if (!users.length) {
        tableBody.innerHTML = `<tr><td colspan="10">No users found</td></tr>`;
        return;
      }

      users.forEach(u => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${u.id}</td>
          <td>${u.userID}</td>
          <td>${u.fullname}</td>
          <td>${u.age}</td>
          <td>${u.gender}</td>
          <td>${u.role}</td>
          <td>${u.username}</td>
          <td>${u.email || ""}</td>
          <td>${u.contact || ""}</td>
          <td><button class="selectBtn">Select</button></td>
        `;

        // Select user to edit
        row.querySelector(".selectBtn").addEventListener("click", () => {
          idField.value = u.id;
          userID.value = u.userID;
          fullname.value = u.fullname;
          age.value = u.age;
          gender.value = u.gender;
          role.value = u.role;
          username.value = u.username;
          email.value = u.email || "";
          contact.value = u.contact || "";
          password.value = "";
        });

        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }

  loadUsers();

  // ➕ Save user
  saveBtn.addEventListener("click", async () => {
    if (!role.value) return alert("Select a role first");

    const data = {
      userID: userID.value,
      fullname: fullname.value,
      age: age.value ? parseInt(age.value) : null,
      gender: gender.value,
      role: role.value,
      username: username.value,
      email: email.value,
      contact: contact.value,
      password: password.value
    };

    try {
      const res = await fetch("http://localhost:3000/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (res.ok) {
        alert("User added!");
        loadUsers();
        document.getElementById("userForm").reset();
        userID.value = "";
        email.value = "";
        contact.value = "";
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error("Error adding user:", err);
    }
  });

  // ✏️ Update user
  updateBtn.addEventListener("click", async () => {
    if (!idField.value) return alert("Select a user first");

    const data = {
      fullname: fullname.value,
      age: age.value ? parseInt(age.value) : null,
      gender: gender.value,
      role: role.value,
      username: username.value,
      email: email.value,
      contact: contact.value,
      password: password.value
    };

    try {
      const res = await fetch(`http://localhost:3000/users/update/${idField.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (res.ok) {
        alert("User updated!");
        loadUsers();
        document.getElementById("userForm").reset();
        userID.value = "";
        email.value = "";
        contact.value = "";
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error("Error updating user:", err);
    }
  });

  // ❌ Delete user
  deleteBtn.addEventListener("click", async () => {
    if (!idField.value) return alert("Select a user first");
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`http://localhost:3000/users/delete/${idField.value}`, {
        method: "DELETE"
      });

      const result = await res.json();
      if (res.ok) {
        alert("User deleted!");
        loadUsers();
        document.getElementById("userForm").reset();
        userID.value = "";
        email.value = "";
        contact.value = "";
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  });
});
