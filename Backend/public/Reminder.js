document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000"; // adjust if backend port differs

  const patientID = document.getElementById("patientID_reminder");
  const fullName = document.getElementById("fullName_reminder");
  const message = document.getElementById("message_reminder");
  const status = document.getElementById("status_reminder");

  const saveBtn = document.querySelector(".save-btn.btn-reminder");
  const updateBtn = document.querySelector(".update-btn.btn-reminder");
  const deleteBtn = document.querySelector(".delete-btn.btn-reminder");

  const tableBody = document.querySelector("#remindersTable tbody");

  let selectedReminderID = null;

  function resetForm() {
    patientID.value = "";
    fullName.value = "";
    message.value = "";
    status.value = "";
    selectedReminderID = null;
    updateBtn.disabled = true;
    deleteBtn.disabled = true;
    document.querySelectorAll("#remindersTable tbody tr").forEach(r => r.classList.remove("selected"));
  }

  // Load reminders
  async function loadReminders() {
    try {
      const res = await fetch(`${API}/reminders`);
      const reminders = await res.json();
      tableBody.innerHTML = "";
      if (!reminders.length) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No reminders found</td></tr>`;
        return;
      }
      reminders.forEach(r => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${r.id}</td>
          <td>${r.patientID}</td>
          <td>${r.fullName}</td>
          <td>${r.message}</td>
          <td>${r.status}</td>
        `;
        row.addEventListener("click", () => {
          document.querySelectorAll("#remindersTable tbody tr").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
          selectedReminderID = r.id;
          patientID.value = r.patientID;
          fullName.value = r.fullName;
          message.value = r.message;
          status.value = r.status;
          updateBtn.disabled = false;
          deleteBtn.disabled = false;
        });
        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading reminders:", err);
    }
  }

  // Autofill full name
  patientID.addEventListener("input", async () => {
    const id = patientID.value.trim();
    if (!id) return fullName.value = "";
    try {
      const res = await fetch(`${API}/patients/${encodeURIComponent(id)}`);
      if (!res.ok) { fullName.value = ""; return; }
      const data = await res.json();
      fullName.value = data.fullName || "";
    } catch {
      fullName.value = "";
    }
  });

  // Save reminder
  saveBtn.addEventListener("click", async () => {
    if (!patientID.value.trim()) return alert("Enter patient ID");
    if (!message.value.trim()) return alert("Enter message");

    const payload = {
      patientID: patientID.value,
      fullName: fullName.value,
      message: message.value,
      status: status.value
    };

    try {
      const res = await fetch(`${API}/reminders/add`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Error saving reminder");
      alert("✅ Reminder saved — email sent (if configured).");
      resetForm();
      loadReminders();
    } catch (err) {
      console.error(err);
      alert("Error saving reminder");
    }
  });

  // Update reminder
  updateBtn.addEventListener("click", async () => {
    if (!selectedReminderID) return alert("Select a reminder first");

    const payload = {
      patientID: patientID.value,
      fullName: fullName.value,
      message: message.value,
      status: status.value
    };

    try {
      const res = await fetch(`${API}/reminders/update/${selectedReminderID}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      if (!res.ok) return alert("Error updating reminder");
      alert("✅ Reminder updated");
      resetForm();
      loadReminders();
    } catch (err) {
      console.error(err);
      alert("Error updating reminder");
    }
  });

  // Delete reminder
  deleteBtn.addEventListener("click", async () => {
    if (!selectedReminderID) return alert("Select a reminder first");
    if (!confirm("Delete this reminder?")) return;

    try {
      const res = await fetch(`${API}/reminders/delete/${selectedReminderID}`, { method: "DELETE" });
      if (!res.ok) return alert("Error deleting reminder");
      alert("🗑 Reminder deleted");
      resetForm();
      loadReminders();
    } catch (err) {
      console.error(err);
      alert("Error deleting reminder");
    }
  });

  resetForm();
  loadReminders();
});
