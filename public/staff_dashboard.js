document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     1. SMOOTH WELCOME NAME LOAD (Doctor/Nurse)
  ===================================================== */
  function loadWelcomeName() {
    const name = localStorage.getItem("staffName") || "Doctor/Nurse";
    const role = localStorage.getItem("staffRole") || "Staff";

    const welcomeEl = document.getElementById("welcomeName");

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${name} (${role})`;

      // Smooth fade effect
      welcomeEl.style.opacity = 0;
      setTimeout(() => {
        welcomeEl.style.transition = "opacity 1s ease";
        welcomeEl.style.opacity = 1;
      }, 100);
    }
  }

  loadWelcomeName();



  /* =====================================================
     2. DASHBOARD STATS
  ===================================================== */
  loadDashboardStats();
  loadDailyTip();

  async function loadDashboardStats() {
    try {
      const res = await fetch("http://localhost:3000/api/dashboard/stats");
      const data = await res.json();

      document.getElementById("patientCount").textContent = data.totalPatients ?? 0;
      document.getElementById("appointmentCount").textContent = data.upcomingAppointments ?? 0;
      document.getElementById("followupCount").textContent = data.pendingFollowUps ?? 0;
      document.getElementById("staffCount").textContent = data.totalStaff ?? 0;

    } catch (error) {
      console.error("Dashboard stats error:", error);
    }
  }

  setInterval(loadDashboardStats, 30000);



  /* =====================================================
     3. DAILY HEALTH TIP ROTATION
  ===================================================== */
  function loadDailyTip() {
    const tips = [
      "Take a 10-minute walk after meals.",
      "Drink 8 glasses of water daily.",
      "Get 7–8 hours of peaceful sleep.",
      "Wash hands regularly to prevent illness.",
      "Eat fruits and vegetables every day.",
      "Stretch every morning for flexibility.",
      "Never skip breakfast — fuel your day.",
      "Get regular health check-ups.",
      "Practice deep breathing daily.",
      "Limit sugar for better health."
    ];

    const pick = tips[Math.floor(Math.random() * tips.length)];

    const el = document.getElementById("dailyTip");
    if (el) el.innerHTML = `<em>${pick}</em>`;
  }

  setInterval(loadDailyTip, 20000);



  /* =====================================================
     4. SIDEBAR SECTION NAVIGATION
  ===================================================== */
  const buttons = document.querySelectorAll('.side-btn[data-target]');
  const sections = document.querySelectorAll('.section');

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;

      sections.forEach(sec => {
        sec.style.display = (sec.id === target) ? "block" : "none";
      });

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });



  /* =====================================================
     5. AUTO-HIDE SIDEBAR ON MOBILE
  ===================================================== */
  const sidebar = document.querySelector(".sidebar");

  // Add mobile toggle button
  const toggleBtn = document.createElement("button");
  toggleBtn.classList.add("mobile-toggle");
  toggleBtn.innerHTML = `<i class="fas fa-bars"></i>`;
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-open");
  });

  // Auto-close sidebar when selecting a menu item (mobile only)
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.remove("sidebar-open");
      }
    });
  });



  /* =====================================================
     6. LOGOUT + TOAST NOTIFICATION
  ===================================================== */
  const logoutButtons = [
    document.getElementById("logoutBtn"),
    document.getElementById("topLogoutBtn")
  ];

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "logout-toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 100);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 2500);

    setTimeout(() => toast.remove(), 3200);
  }

  function performLogout() {
    if (!confirm("Are you sure you want to logout?")) return;

    // Clear session
    localStorage.clear();
    sessionStorage.clear();

    showToast("Logging out...");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  }

  logoutButtons.forEach(btn => {
    if (btn) btn.addEventListener("click", performLogout);
  });



  /* Prevent going back after logout */
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });

});
