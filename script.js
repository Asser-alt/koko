const STORAGE_KEY = "clients-data";
const months = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const filters = [
  "فلتر 1",
  "فلتر 2",
  "فلتر 3",
  "فلتر 4",
  "فلتر 5",
  "فلتر 6",
  "فلتر 7",
];
const filterIntervals = [3, 6, 6, 12, 12, 12, 12];

function normalizeClient(client) {
  return {
    id: client.id || crypto.randomUUID(),
    name: client.name || "",
    address: client.address || "",
    phone: client.phone || "",
    notes: client.notes || "",
    schedule: client.schedule || {},
    createdAt: client.createdAt || new Date().toISOString(),
  };
}

function loadClients() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || []).map(
      normalizeClient,
    );
  } catch {
    return [];
  }
}

function saveClients(clients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function formatDate(date) {
  const value = new Date(date);
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date) {
  const value = new Date(date);
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function normalizeCellState(cellState) {
  if (typeof cellState === "boolean") {
    return { active: cellState, startDate: null };
  }

  return {
    active: Boolean(cellState?.active),
    startDate: cellState?.startDate || null,
  };
}

function getNextDueDate(startDate, filterIndex) {
  const date = new Date(startDate || new Date());
  const interval = filterIntervals[filterIndex] || 12;
  date.setMonth(date.getMonth() + interval);
  return date;
}

function updateCurrentDateLabel() {
  const element = document.getElementById("currentDateLabel");
  if (!element) return;
  element.textContent = `التاريخ والوقت الحالي: ${formatDateTime(new Date())}`;
}

function getCellStatus(client, monthIndex, filterIndex) {
  const state = normalizeCellState(
    client.schedule?.[monthIndex]?.[filterIndex],
  );
  if (!state.active) {
    return { active: false, due: false, nextDueDate: null, startDate: null };
  }

  const startDate = state.startDate ? new Date(state.startDate) : new Date();
  const nextDueDate = getNextDueDate(startDate, filterIndex);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDueDate.setHours(0, 0, 0, 0);

  return {
    active: true,
    due: today >= nextDueDate,
    nextDueDate,
    startDate,
  };
}

function updateHomeReminderBanner() {
  const banner = document.getElementById("homeReminderBanner");
  if (!banner) return;

  const clients = loadClients();
  const reminders = clients.flatMap((client) =>
    months.flatMap((_, monthIndex) =>
      filters.flatMap((_, filterIndex) => {
        const status = getCellStatus(client, monthIndex, filterIndex);
        if (!status.active) return [];

        const label = status.due
          ? "مستحق الآن"
          : `سيتم التجديد في ${formatDate(status.nextDueDate)}`;

        return [
          `<div>• ${client.name} | ${filters[filterIndex]} | ${label}</div>`,
        ];
      }),
    ),
  );

  if (!reminders.length) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }

  banner.classList.remove("hidden");
  banner.innerHTML = `<strong>تنبيهات:</strong><br />${reminders.join("")}`;
}

function renderClients() {
  const list = document.getElementById("clientsList");
  if (!list) return;

  const clients = loadClients();
  if (!clients.length) {
    list.innerHTML =
      '<p class="empty-state">لا يوجد عملاء حتى الآن. اضغط على زر الإضافة لتبدأ.</p>';
    updateHomeReminderBanner();
    return;
  }

  list.innerHTML = "";
  clients.forEach((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "client-card";
    button.innerHTML = `
      <span>
        <strong>${client.name}</strong>
        <small>${client.phone || "لا يوجد رقم"}</small>
      </span>
      <span>فتح التفاصيل</span>
    `;
    button.addEventListener("click", () => {
      window.location.href = `client.html?id=${client.id}`;
    });
    list.appendChild(button);
  });

  updateHomeReminderBanner();
}

function setupHomePage() {
  const addBtn = document.getElementById("addClientBtn");
  const panel = document.getElementById("clientFormPanel");
  const cancelBtn = document.getElementById("cancelFormBtn");
  const form = document.getElementById("clientForm");

  if (!addBtn || !panel || !cancelBtn || !form) return;

  addBtn.addEventListener("click", () => {
    panel.classList.remove("hidden");
    form.querySelector('input[name="name"]').focus();
  });

  cancelBtn.addEventListener("click", () => {
    panel.classList.add("hidden");
    form.reset();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const client = normalizeClient({
      id: crypto.randomUUID(),
      name: data.get("name").toString().trim(),
      address: data.get("address").toString().trim(),
      phone: data.get("phone").toString().trim(),
      createdAt: new Date().toISOString(),
    });

    if (!client.name) return;

    const clients = loadClients();
    clients.push(client);
    saveClients(clients);
    form.reset();
    panel.classList.add("hidden");
    renderClients();
  });

  renderClients();
  setInterval(updateHomeReminderBanner, 1000);
}

function bindToggleCells(client) {
  document.querySelectorAll(".toggle-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      const monthIndex = Number(cell.dataset.month);
      const filterIndex = Number(cell.dataset.filter);
      const isActive = cell.dataset.active === "true";
      const nextActive = !isActive;

      cell.dataset.active = String(nextActive);
      cell.classList.toggle("active", nextActive);

      const clients = loadClients();
      const targetClient = clients.find((item) => item.id === client.id);
      if (!targetClient) return;

      if (!targetClient.schedule[monthIndex]) {
        targetClient.schedule[monthIndex] = {};
      }

      targetClient.schedule[monthIndex][filterIndex] = nextActive
        ? {
            active: true,
            startDate: new Date().toISOString(),
          }
        : { active: false, startDate: null };
      saveClients(clients);

      updateHomeReminderBanner();
    });
  });
}

function renderDetailsPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const client = loadClients().find((item) => item.id === id);
  const container = document.getElementById("clientDetails");
  if (!container) return;

  if (!client) {
    container.innerHTML = `
      <p class="empty-state">لم يتم العثور على هذا العميل.</p>
      <a class="back-link" href="index.html">العودة إلى الصفحة الرئيسية</a>
    `;
    return;
  }

  container.innerHTML = `
    <div class="details-layout">
      <section class="details-card">
        <a class="back-link" href="index.html">← العودة</a>
        <h2>${client.name}</h2>
        <div id="currentDateLabel" class="current-date-label"></div>
        <div class="detail-grid">
          <div><strong>العنوان:</strong> ${client.address || "غير محدد"}</div>
          <div><strong>رقم الهاتف:</strong> ${client.phone || "غير محدد"}</div>
        </div>
      </section>

      <section class="table-card">
        <h3>جدول الملاحظات الشهرية</h3>
        <p>الفلتر 1: كل 3 أشهر • الفلتر 2: كل 6 أشهر • الفلتر 3: كل 6 أشهر • الفلاتر 4-7: كل سنة</p>
        <table>
          <thead>
            <tr>
              <th>الشهر</th>
              ${filters.map((filter) => `<th>${filter}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${months
              .map(
                (month, monthIndex) => `
                  <tr>
                    <td>${month}</td>
                    ${filters
                      .map((_, filterIndex) => {
                        const status = getCellStatus(
                          client,
                          monthIndex,
                          filterIndex,
                        );
                        return `<td class="toggle-cell ${status.active ? "active" : ""} ${status.active && status.due ? "due" : ""}" data-active="${status.active}" data-month="${monthIndex}" data-filter="${filterIndex}"></td>`;
                      })
                      .join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>

        <label>
          الملاحظات
          <textarea id="clientNotes" class="notes-box" placeholder="اكتب ملاحظاتك هنا...">${client.notes || ""}</textarea>
        </label>
      </section>
    </div>
  `;

  bindToggleCells(client);
  updateCurrentDateLabel();
  setInterval(updateCurrentDateLabel, 1000);

  const notesField = document.getElementById("clientNotes");
  if (notesField) {
    notesField.addEventListener("input", () => {
      const clients = loadClients();
      const targetClient = clients.find((item) => item.id === client.id);
      if (!targetClient) return;
      targetClient.notes = notesField.value;
      saveClients(clients);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "home") {
    setupHomePage();
  } else if (page === "details") {
    renderDetailsPage();
  }
});
