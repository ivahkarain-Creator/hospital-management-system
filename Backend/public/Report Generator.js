document.addEventListener("DOMContentLoaded", () => {
    const title = document.getElementById("reportTitle_reports");
    const reportType = document.getElementById("reportType_reports");
    const fromDate = document.getElementById("fromDate_reports");
    const toDate = document.getElementById("toDate_reports");
    const formatRadios = document.getElementsByName("format_reports");

    const saveBtn = document.querySelector(".save-btn.btn-reports");
    const generateBtn = document.querySelector(".generate-btn.btn-reports");
    const downloadBtn = document.querySelector(".download-btn.btn-reports");
    const backBtn = document.querySelector(".back-btn.btn-reports");

    const reportTableBody = document.querySelector("#reportTable tbody");

    let lastGeneratedFilePath = null;
    let lastGeneratedFormat = null;

    // ---------------------------------------
    // Helper: Get selected format
    // ---------------------------------------
    function getSelectedFormat() {
        for (let r of formatRadios) {
            if (r.checked) return r.value;
        }
        return null;
    }

    // ---------------------------------------
    // Validate form
    // ---------------------------------------
    function validateForm() {
        if (!title.value.trim()) return alert("Please enter a report title.");
        if (!reportType.value) return alert("Please select a report type.");
        if (!fromDate.value || !toDate.value) return alert("Please select both FROM and TO dates.");
        if (!getSelectedFormat()) return alert("Please choose a report format.");
        return true;
    }

    // ---------------------------------------
    // SAVE (optional)
    // ---------------------------------------
    saveBtn.addEventListener("click", () => {
        if (!validateForm()) return;
        alert("Report details saved successfully!");
    });

    // ---------------------------------------
    // GENERATE REPORT
    // ---------------------------------------
    generateBtn.addEventListener("click", async () => {
        if (!validateForm()) return;

        const format = getSelectedFormat();
        lastGeneratedFormat = format;

        const endpoint =
            format === "pdf"
                ? "/reports/generate/pdf"
                : format === "excel"
                ? "/reports/generate/excel"
                : "/reports/generate/word";

        const payload = {
            reportTitle: title.value.trim(),
            reportType: reportType.value,
            fromDate: fromDate.value,
            toDate: toDate.value,
        };

        try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) return alert("Failed to generate report.");

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            lastGeneratedFilePath = downloadUrl;

            const ext =
                format === "pdf"
                    ? "pdf"
                    : format === "excel"
                    ? "xlsx"
                    : "docx";

            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `${title.value}.${ext}`;
            link.click();

            alert("Report generated successfully!");
            addReportToTable(payload, format);

        } catch (err) {
            console.error("Error generating report:", err);
            alert("Error generating report.");
        }
    });

    // ---------------------------------------
    // DOWNLOAD AGAIN
    // ---------------------------------------
    downloadBtn.addEventListener("click", () => {
        if (!lastGeneratedFilePath)
            return alert("No report generated yet.");

        const ext =
            lastGeneratedFormat === "pdf"
                ? "pdf"
                : lastGeneratedFormat === "excel"
                ? "xlsx"
                : "docx";

        const link = document.createElement("a");
        link.href = lastGeneratedFilePath;
        link.download = `${title.value}.${ext}`;
        link.click();
    });

    // ---------------------------------------
    // BACK
    // ---------------------------------------
    backBtn.addEventListener("click", () => {
        window.history.back();
    });

    // ---------------------------------------
    // Add report row to table
    // ---------------------------------------
    function addReportToTable({ reportTitle, reportType, fromDate, toDate }, format) {
        if (reportTableBody.children.length === 1 &&
            reportTableBody.children[0].children[0].colSpan === 5) {
            reportTableBody.innerHTML = "";
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${reportTitle}</td>
            <td>${reportType}</td>
            <td>${fromDate} to ${toDate}</td>
            <td>${format.toUpperCase()}</td>
            <td>${new Date().toLocaleString()}</td>
        `;
        reportTableBody.prepend(row);
    }
});
