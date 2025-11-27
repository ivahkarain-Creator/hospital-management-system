
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:3000"; // change if backend port differs

  const appointmentForm = document.getElementById("appointmentForm");
  const patientID = document.getElementById("patientID_appointment");
  const patientName = document.getElementById("patientname_appointment");
  const appointmentDate = document.getElementById("appointment_date_appointment");
  const doctorID = document.getElementById("doctorID_appointment");
  const doctorUsername = document.getElementById("doctor_username_appointment");
  const purpose = document.getElementById("purpose_appointment");
  const status = document.getElementById("status_appointment");

  const saveBtn = document.querySelector(".save-btn.btn-appointment");
  const updateBtn = document.querySelector(".update-btn.btn-appointment");
  const deleteBtn = document.querySelector(".delete-btn.btn-appointment");

  const appointmentsTableBody = document.querySelector("#appointmentsTable tbody");

  let selectedAppointmentID = null;

  function resetForm() {
    appointmentForm.reset();
    patientName.value = "";
    doctorUsername.value = "";
    selectedAppointmentID = null;
    updateBtn.disabled = true;
    deleteBtn.disabled = true;
    document.querySelectorAll("#appointmentsTable tbody tr").forEach(r => r.classList.remove("selected"));
  }

  // Load appointments
  async function loadAppointments() {
    try {
      const res = await fetch(`${API}/appointments`);
      const appointments = await res.json();
      appointmentsTableBody.innerHTML = "";
      if (!appointments || appointments.length === 0) {
        appointmentsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No appointments found.</td></tr>`;
        return;
      }
      appointments.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${a.appointmentID || ""}</td>
          <td>${a.patientID}</td>
          <td>${a.patientName}</td>
          <td>${new Date(a.appointmentDate).toLocaleString()}</td>
          <td>${a.doctorID}</td>
          <td>${a.purpose || ""}</td>
          <td>${a.status}</td>
          <td><button class="select-btn">Select</button></td>
        `;
        row.querySelector(".select-btn").addEventListener("click", () => {
          document.querySelectorAll("#appointmentsTable tbody tr").forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");
          selectedAppointmentID = a.appointmentID;
          patientID.value = a.patientID;
          patientName.value = a.patientName;
          // set datetime-local input value: convert ISO to yyyy-mm-ddThh:mm
          appointmentDate.value = new Date(a.appointmentDate).toISOString().slice(0,16);
          doctorID.value = a.doctorID;
          doctorUsername.value = a.doctorUsername;
          purpose.value = a.purpose || "";
          status.value = a.status;
          updateBtn.disabled = false;
          deleteBtn.disabled = false;
        });
        appointmentsTableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Error loading appointments:", err);
    }
  }

  // Autofill patient name on paste/type
  patientID.addEventListener("input", async () => {
    const id = patientID.value.trim();
    if (!id) return patientName.value = "";
    try {
      const res = await fetch(`${API}/patients/${encodeURIComponent(id)}`);
      if (!res.ok) { patientName.value = ""; return; }
      const p = await res.json();
      patientName.value = p.fullName || p.fullname || "";
    } catch {
      patientName.value = "";
    }
  });

  // Autofill doctor username on paste/type
  doctorID.addEventListener("input", async () => {
    const id = doctorID.value.trim();
    if (!id) return doctorUsername.value = "";
    try {
      const res = await fetch(`${API}/users/${encodeURIComponent(id)}`);
      if (!res.ok) { doctorUsername.value = ""; return; }
      const u = await res.json();
      doctorUsername.value = u.username || "";
    } catch {
      doctorUsername.value = "";
    }
  });

  // Validate future date
  function validateFutureDate() {
    const now = new Date();
    const sel = new Date(appointmentDate.value);
    return sel > now;
  }

  // Check doctor availability (calls backend)
  async function checkDoctorAvailability() {
    const res = await fetch(`${API}/appointments/check-availability`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ doctorID: doctorID.value, appointmentDate: appointmentDate.value })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.available;
  }

  // Save appointment
  saveBtn.addEventListener("click", async () => {
    if (!patientID.value.trim()) return alert("Enter patient ID");
    if (!doctorID.value.trim()) return alert("Enter doctor/nurse ID");
    if (!appointmentDate.value) return alert("Select appointment date/time");
    if (!validateFutureDate()) return alert("Appointment must be in the future");
    // check doctor availability
    const free = await checkDoctorAvailability();
    if (!free) return alert("Doctor not available at that time. Choose another time.");

    const payload = {
      patientID: patientID.value,
      patientName: patientName.value,
      appointmentDate: appointmentDate.value,
      doctorID: doctorID.value,
      doctorUsername: doctorUsername.value,
      purpose: purpose.value,
      status: status.value
    };

    try {
      const res = await fetch(`${API}/appointments/add`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Error saving appointment");
      alert("✅ Saved — reminder sent (if email configured).");
      resetForm();
      loadAppointments();
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving appointment");
    }
  });

  // Update and Delete handlers — simple implementations (requires backend endpoints)
  updateBtn.addEventListener("click", async () => {
    if (!selectedAppointmentID) return alert("Select appointment first");
    const payload = {
      patientID: patientID.value,
      patientName: patientName.value,
      appointmentDate: appointmentDate.value,
      doctorID: doctorID.value,
      doctorUsername: doctorUsername.value,
      purpose: purpose.value,
      status: status.value
    };
    try {
      const res = await fetch(`${API}/appointments/update/${selectedAppointmentID}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
      });
      if (!res.ok) return alert("Error updating appointment");
      alert("Updated");
      resetForm();
      loadAppointments();
    } catch (err) {
      console.error(err);
      alert("Error updating");
    }
  });

  deleteBtn.addEventListener("click", async () => {
    if (!selectedAppointmentID) return alert("Select appointment first");
    if (!confirm("Delete this appointment?")) return;
    try {
      const res = await fetch(`${API}/appointments/delete/${selectedAppointmentID}`, { method: "DELETE" });
      if (!res.ok) return alert("Error deleting");
      alert("Deleted");
      resetForm();
      loadAppointments();
    } catch (err) {
      console.error(err);
      alert("Error deleting");
    }
  });

  resetForm();
  loadAppointments();
});

