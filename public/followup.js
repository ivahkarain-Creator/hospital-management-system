document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000"; // change if backend port differs

  const followForm = document.getElementById("followForm");
  const recordID = document.getElementById("recordID_followup");
  const patientID = document.getElementById("patientID_followup");
  const fullname = document.getElementById("fullname_followup");
  const appointmentDate = document.getElementById("appointmentDate_followup");
  const nextVisit = document.getElementById("nextVisit_followup");
  const notes = document.getElementById("notes_followup");
  const status = document.getElementById("status_followup");

  const saveBtn = document.querySelector(".save-btn.btn-followup");
  const updateBtn = document.querySelector(".update-btn.btn-followup");
  const deleteBtn = document.querySelector(".delete-btn.btn-followup");

  const followTableBody = document.querySelector("#followTable tbody");

  let selectedRecordID = null;

  function resetForm() {
    followForm.reset();
    fullname.value = "";
    selectedRecordID = null;
    updateBtn.disabled = true;
    deleteBtn.disabled = true;
    document.querySelectorAll("#followTable tbody tr").forEach(r => r.classList.remove("selected"));
  }

  // Load all follow-ups
  async function loadFollowups() {
    try {
      const res = await fetch(`${API}/followups`);
      const followups = await res.json();

      followTableBody.innerHTML = "";
      if (!followups || followups.length === 0) {
        followTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No follow-up records found.</td></tr>`;
        return;
      }

      followups.forEach(f => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${f.recordID}</td>
          <td>${f.patientID}</td>
          <td>${f.fullname || ""}</td>
          <td>${f.appointmentDate ? new Date(f.appointmentDate).toLocaleDateString() : ""}</td>
          <td>${f.nextVisitDate ? new Date(f.nextVisitDate).toLocaleDateString() : ""}</td>
          <td>${f.notes || ""}</td>
          <td>${f.status}</td>
          <td><button class="select-btn">Select</button></td>
        `;

        row.querySelector(".select-btn").addEventListener("click", () => {
          document.querySelectorAll("#followTable tbody tr").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");

          selectedRecordID = f.recordID;
          recordID.value = f.recordID;
          patientID.value = f.patientID;
          fullname.value = f.fullname || "";
          appointmentDate.value = f.appointmentDate ? f.appointmentDate.split("T")[0] : "";
          nextVisit.value = f.nextVisitDate ? f.nextVisitDate.split("T")[0] : "";
          notes.value = f.notes || "";
          status.value = f.status;

          updateBtn.disabled = false;
          deleteBtn.disabled = false;
        });

        followTableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading follow-ups:", err);
    }
  }

  // Auto-fill fullname from patientID
  patientID.addEventListener("blur", async () => {
    const id = patientID.value.trim();
    if (!id) { fullname.value = ""; return; }
    try {
      const res = await fetch(`${API}/patients/${encodeURIComponent(id)}`);
      if (!res.ok) { fullname.value = ""; return; }
      const p = await res.json();
      fullname.value = p.fullName || "";
    } catch {
      fullname.value = "";
    }
  });

  // SAVE follow-up
  saveBtn.addEventListener("click", async () => {
    if (!patientID.value.trim()) return alert("Enter patient ID");
    if (!appointmentDate.value) return alert("Select appointment date");
    if (!status.value) return alert("Select status");

    const payload = {
      patientID: patientID.value,
      fullname: fullname.value,
      appointmentDate: appointmentDate.value,
      nextVisitDate: nextVisit.value || null,
      notes: notes.value,
      status: status.value
    };

    try {
      const res = await fetch(`${API}/followups/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Error saving follow-up");
      alert("✅ Follow-up saved (email sent if patient has email).");
      resetForm();
      loadFollowups();
    } catch (err) {
      console.error("Save follow-up error:", err);
      alert("Error saving follow-up");
    }
  });

  // UPDATE follow-up
  updateBtn.addEventListener("click", async () => {
    if (!selectedRecordID) return alert("Select a follow-up record first");

    const payload = {
      patientID: patientID.value,
      fullname: fullname.value,
      appointmentDate: appointmentDate.value,
      nextVisitDate: nextVisit.value || null,
      notes: notes.value,
      status: status.value
    };

    try {
      const res = await fetch(`${API}/followups/update/${selectedRecordID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return alert("Error updating follow-up");
      alert("✅ Follow-up updated");
      resetForm();
      loadFollowups();
    } catch (err) {
      console.error(err);
      alert("Error updating follow-up");
    }
  });

  // DELETE follow-up
  deleteBtn.addEventListener("click", async () => {
    if (!selectedRecordID) return alert("Select a follow-up record first");
    if (!confirm("Delete this follow-up record?")) return;

    try {
      const res = await fetch(`${API}/followups/delete/${selectedRecordID}`, { method: "DELETE" });
      if (!res.ok) return alert("Error deleting follow-up");
      alert("✅ Follow-up deleted");
      resetForm();
      loadFollowups();
    } catch (err) {
      console.error(err);
      alert("Error deleting follow-up");
    }
  });

  resetForm();
  loadFollowups();
});
