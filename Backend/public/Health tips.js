const form = document.getElementById("healthTipsForm");
const tipsIDField = document.getElementById("tipsID_healthtips");
const topicField = document.getElementById("topic_healthtips");
const descField = document.getElementById("description_healthtips");
const fileField = document.getElementById("file_healthtips");

const editBtn = document.querySelector(".edit-btn.btn-healthtips");
const deleteBtn = document.querySelector(".delete-btn.btn-healthtips");

const tableBody = document.querySelector("#healthTipsTable tbody");

let selectedTipID = null;

// Load all tips
async function loadTips() {
  const res = await fetch("http://localhost:3000/tips");
  const tips = await res.json();

  tableBody.innerHTML = tips
    .map(
      (tip) => `
      <tr data-id="${tip.tipsID}">
        <td>${tip.tipsID}</td>
        <td>${tip.topic}</td>
        <td>${tip.description}</td>
        <td>${new Date(tip.dateCreated).toLocaleString()}</td>
        <td>${tip.filePath ? `<a href="${tip.filePath}" target="_blank">View File</a>` : ""}</td>
      </tr>`
    )
    .join("");

  addRowListeners();
}

// Enable row selection
function addRowListeners() {
  document.querySelectorAll("#healthTipsTable tbody tr").forEach((row) => {
    row.addEventListener("click", () => {
      document
        .querySelectorAll("#healthTipsTable tbody tr")
        .forEach((r) => r.classList.remove("selected"));

      row.classList.add("selected");

      const cells = row.children;

      selectedTipID = cells[0].textContent;
      tipsIDField.value = cells[0].textContent;
      topicField.value = cells[1].textContent;
      descField.value = cells[2].textContent;

      editBtn.disabled = false;
      deleteBtn.disabled = false;
    });
  });
}

// SAVE new tip
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch("http://localhost:3000/tips/add", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      alert("✔ Saved!");
      form.reset();
      tipsIDField.value = data.tipsID;
      loadTips();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error saving health tip");
  }
});

// UPDATE tip
editBtn.addEventListener("click", async () => {
  if (!selectedTipID) return alert("Select a tip to edit");

  const formData = new FormData();
  formData.append("topic", topicField.value);
  formData.append("description", descField.value);
  if (fileField.files[0]) formData.append("file", fileField.files[0]);

  try {
    const res = await fetch(`http://localhost:3000/tips/update/${selectedTipID}`, {
      method: "PUT",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      alert("✔ Updated!");
      form.reset();
      selectedTipID = null;
      loadTips();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error updating tip");
  }
});

// DELETE tip
deleteBtn.addEventListener("click", async () => {
  if (!selectedTipID) return alert("Select a tip to delete");
  if (!confirm("Are you sure you want to delete this tip?")) return;

  try {
    const res = await fetch(`http://localhost:3000/tips/delete/${selectedTipID}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      alert("🗑 Deleted!");
      form.reset();
      selectedTipID = null;
      loadTips();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error deleting tip");
  }
});

// Initial load
loadTips();
