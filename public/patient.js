// Updated Patient JS Frontend (Aligned with New HTML Form)
document.addEventListener("DOMContentLoaded", () => {

  // --- FORM ELEMENTS ---
  const patientForm = document.getElementById("patientForm_patient");
  const patientID = document.getElementById("patientID_patient");
  const fullName = document.getElementById("fullName_patient");
  const age = document.getElementById("age_patient");
  const gender = document.getElementById("gender_patient");
  const phone = document.getElementById("phone_patient");
  const email = document.getElementById("email_patient");
  const notes = document.getElementById("notes_patient");

  const saveBtn = document.querySelector(".save-btn.btn-patient");
  const updateBtn = document.querySelector(".update-btn.btn-patient");
  const deactivateBtn = document.querySelector(".deactivate-btn.btn-patient");

  const patientsTableBody = document.querySelector("#patientsTable_patient tbody");


  // --- GENERATE UNIQUE PATIENT ID ---
  function generatePatientID() {
    return "P-" + Math.floor(10000 + Math.random() * 90000); // 5-digit ID
  }


  // --- RESET FORM ---
  function resetForm() {
    patientForm.reset();
    patientID.value = generatePatientID();
    updateBtn.disabled = true;
    deactivateBtn.disabled = true;

    document.querySelectorAll("#patientsTable_patient tbody tr")
      .forEach(r => r.classList.remove("selected"));
  }

  patientID.value = generatePatientID();


  // --- LOAD PATIENTS ---
  async function loadPatients() {
    try {
      const res = await fetch("http://localhost:3000/patients");
      const patients = await res.json();

      patientsTableBody.innerHTML = "";
      if (!patients.length) {
        patientsTableBody.innerHTML =
          `<tr><td colspan="9" style="text-align:center;">No patients found.</td></tr>`;
        return;
      }

      patients.forEach(p => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${p.patientID}</td>
          <td>${p.fullName}</td>
          <td>${p.age}</td>
          <td>${p.gender}</td>
          <td>${p.phone}</td>
          <td>${p.email}</td>
          <td>${p.notes || ""}</td>
          <td>${p.status}</td>
          <td><button class="selectPatientBtn">Select</button></td>
        `;

        row.querySelector(".selectPatientBtn").addEventListener("click", () => {
          document.querySelectorAll("#patientsTable_patient tbody tr")
            .forEach(r => r.classList.remove("selected"));
          row.classList.add("selected");

          // Fill form fields
          patientID.value = p.patientID;
          fullName.value = p.fullName;
          age.value = p.age;
          gender.value = p.gender;
          phone.value = p.phone;
          email.value = p.email;
          notes.value = p.notes || "";

          updateBtn.disabled = false;
          deactivateBtn.disabled = false;
        });

        patientsTableBody.appendChild(row);
      });

    } catch (err) {
      console.error("❌ Error loading patients:", err);
      patientsTableBody.innerHTML =
        `<tr><td colspan="9" style="color:red;text-align:center;">Error loading patients</td></tr>`;
    }
  }


  // --- VALIDATE FORM ---
  function validateForm() {
    if (!fullName.value.trim()) return alert("⚠ Full Name is required."), false;
    if (!age.value || age.value <= 0) return alert("⚠ Age must be a valid number."), false;
    if (!gender.value) return alert("⚠ Gender is required."), false;
    if (!phone.value.trim()) return alert("⚠ Phone is required."), false;
    if (!email.value.trim()) return alert("⚠ Email is required."), false;

    return true;
  }


  // --- SAVE PATIENT ---
  saveBtn.addEventListener("click", async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = {
      patientID: patientID.value,
      fullName: fullName.value,
      age: age.value,
      gender: gender.value,
      phone: phone.value,
      email: email.value,
      notes: notes.value,
      status: "Active"
    };

    try {
      const res = await fetch("http://localhost:3000/patients/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert("✅ Patient added!");
        resetForm();
        loadPatients();
      } else {
        const err = await res.json();
        alert("⚠ Error adding patient: " + err.message);
      }
    } catch (err) {
      console.error(err);
    }
  });


  // --- UPDATE PATIENT ---
  updateBtn.addEventListener("click", async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = {
      patientID: patientID.value,
      fullName: fullName.value,
      age: age.value,
      gender: gender.value,
      phone: phone.value,
      email: email.value,
      notes: notes.value
    };

    try {
      const res = await fetch("http://localhost:3000/patients/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert("✅ Patient updated!");
        resetForm();
        loadPatients();
      } else {
        const err = await res.json();
        alert("⚠ Error updating patient: " + err.message);
      }

    } catch (err) {
      console.error(err);
    }
  });


  // --- DEACTIVATE PATIENT ---
  deactivateBtn.addEventListener("click", async e => {
    e.preventDefault();

    const id = patientID.value;
    if (!id) return alert("⚠ Select a patient first");

    if (!confirm("Deactivate this patient?")) return;

    try {
      const res = await fetch(`http://localhost:3000/patients/deactivate/${id}`, {
        method: "PUT"
      });

      if (res.ok) {
        alert("⚠ Patient deactivated");
        resetForm();
        loadPatients();
      } else {
        const err = await res.json();
        alert("⚠ Error deactivating patient: " + err.message);
      }

    } catch (err) {
      console.error(err);
    }
  });


  // INITIAL LOAD
  resetForm();
  loadPatients();
});
