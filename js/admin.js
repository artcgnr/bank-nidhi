import { db, ref, onValue, update } from "./database.js";
import { checkAndSetBranchName, formatDate } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  checkAndSetBranchName();

  ['pending', 'approved', 'sent', 'rejected'].forEach(type => {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById(`fromdate_${type}`).value = today;
    document.getElementById(`todate_${type}`).value = today;
  });

  fetchData(); // Load all data initially

  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const type = button.getAttribute('data-type');
      fetchData(type);
    });
  });
});

let seenTransferIds = new Set();
let isFirstLoad = true;
const notificationSound = new Audio('./audio/2.mp3');

function fetchData(tabType = null) {
  const dbRef = ref(db, 'transfers');
  const isFilteredFetch = tabType !== null;

  onValue(dbRef, snapshot => {
    const allCenters = snapshot.val();
    if (!allCenters) return;

    const types = tabType ? [tabType] : ['pending', 'approved', 'sent', 'rejected'];
    types.forEach(type => document.getElementById(`${type}List`).innerHTML = '');

    const allRows = {
      pending: [],
      approved: [],
      sent: [],
      rejected: []
    };

    Object.entries(allCenters).forEach(([center, transfers]) => {
      Object.entries(transfers).forEach(([id, item]) => {
        const fullId = `${center}/${id}`;
        const status = item.status;
        const itemDate = item.date ? item.date.split("T")[0] : null;

        types.forEach(type => {
          const from = document.getElementById(`fromdate_${type}`).value;
          const to = document.getElementById(`todate_${type}`).value;
          if (from && to && itemDate && (itemDate < from || itemDate > to)) return;

          if (!seenTransferIds.has(fullId)) {
            seenTransferIds.add(fullId);
            // 👇 Notifications only for *initial unfiltered load*
            if (!isFirstLoad && !isFilteredFetch) {
              showToast(`🔔 New transfer submitted by ${item.branch}`);
              notificationSound.play();
            }
          }

          if (type === 'pending' && status === 'Pending') {
            allRows.pending.push({ item, fullId });
          } else if (type === 'approved' && status === 'Approved' && !item.isSent) {
            allRows.approved.push({ item, fullId });
          } else if (type === 'sent' && status === 'completed' && item.isSent) {
            allRows.sent.push({ item, fullId });
          } else if (type === 'rejected' && (status === 'Rejected' || status === 'Bank Rejected')) {
            allRows.rejected.push({ item, fullId });
          }
        });
      });
    });

    types.forEach(type => {
      allRows[type].sort((a, b) => new Date(a.item.date) - new Date(b.item.date));
      allRows[type].forEach(({ item, fullId }) => {
        renderRow(item, fullId, `${type}List`, type.charAt(0).toUpperCase() + type.slice(1), item.isSent);
      });
    });

    isFirstLoad = false;
  });
}


function renderRow(item, fullId, containerId, statusFilter, ) {
  const container = document.getElementById(containerId);
  let table = container.querySelector('table');
  const idAttr = fullId.replace(/\//g, '_');

  if (!table) {
    const wrapper = document.createElement('div');
    wrapper.style.overflowX = 'auto';
    wrapper.style.maxWidth = '100%';
    wrapper.style.height = '425px';

    table = document.createElement('table');
    table.className = 'transfer-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Branch</th>
          <th>Date</th>
          <th>Pledge No</th>
          <th>Beneficiary</th>
          <th>Account Number</th>
          <th>IFSC</th>
          <th>Method</th>
          <th>Amount</th>
          <th class="act">Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  const tbody = table.querySelector('tbody');
  const row = document.createElement('tr');

  row.innerHTML = `
  <tr>
    <td><b>${item.branch}</b></td>
    <td>${formatDate(item.date)}</td>
    <td>${item.pledgeNumber}</td>
    <td>${item.BeneficiaryName}</td>
    <td>${item.accountNumber}</td>
    <td>${item.ifscCode}</td>
    <td>${item.transferType}</td>
    <td>₹${item.amount}</td>
    <td class="act" id="actions-${idAttr}"></td>
    </tr>
  `;

  const actionsCell = row.querySelector(`#actions-${idAttr}`);

  if (statusFilter === 'Pending') {
    actionsCell.innerHTML = `
      <button class="action-button btn-approve" onclick="updateStatus('${fullId}', 'Approved')">Approve</button>
      <button class="action-button btn-reject" onclick="updateStatus('${fullId}', 'Rejected')">Reject</button>
    `;
  } else if (statusFilter === 'Approved') {
    actionsCell.innerHTML = `
      <button class="action-button btn-send" onclick="markAsSent('${fullId}', 'completed')">completed</button>
       <button class="action-button btn-reject" onclick="updateStatus('${fullId}', 'Bank Rejected')">Rejected</button>
    `;
  } else {
    actionsCell.textContent = '-';
  }

  tbody.appendChild(row);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

window.updateStatus = function(fullId, status) {
  const itemRef = ref(db, 'transfers/' + fullId);
  update(itemRef, { status }).catch(err => {
    alert("Failed to update status: " + err.message);
  });
}

window.markAsSent = function(id, status) {
  const itemRef = ref(db, 'transfers/' + id);
  update(itemRef, { status, isSent: true }).catch(err => {
    alert("Failed to mark as sent: " + err.message);
  });
}


window.exportToExcel = function(type) {
  const container = document.getElementById(type + 'List');
  const table = container.querySelector('table');

  if (!table) {
    alert("No data available to export.");
    return;
  }

  const rows = [];
  const tbodyRows = table.querySelectorAll('tbody tr');

  tbodyRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const data = {
      "TRANSACTION TYPE": (cells[6]?.textContent.trim() || "").toUpperCase(),
      "DEBIT ACCOUNT NUMBER": "10240200011278",
      "TRANSACTION AMOUNT": (cells[7]?.textContent.replace('₹', '').trim() || "").toUpperCase(),
      "VALUE DATE": formatDate(new Date().toISOString().split("T")[0]).toUpperCase(),
      "BENEFICIARY ACCOUNT NUMBER": (cells[4]?.textContent.trim() || "").toUpperCase(),
      "BENEFICIARY NAME": (cells[3]?.textContent.trim() || "").toUpperCase(),
      "IFSC CODE": (cells[5]?.textContent.trim() || "").toUpperCase(),
      "BENEFICIARY EMAIL ID": "",
      "BENEFICIARY ID": "",
      "CREDIT REMARKS": "CHENGANNUR NIDHI",
      "DEBIT REMARKS": (cells[0]?.textContent.trim() || "").toUpperCase(),
      "UNIQUE CUSTOMER REFERENCE NUMBER": ""
    };

    rows.push(data);
  });

  if (rows.length === 0) {
    alert("No data to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "TRANSACTION TYPE",
    "DEBIT ACCOUNT NUMBER",
    "TRANSACTION AMOUNT",
    "VALUE DATE",
    "BENEFICIARY ACCOUNT NUMBER",
    "BENEFICIARY NAME",
    "IFSC CODE",
    "BENEFICIARY EMAIL ID",
    "BENEFICIARY ID",
    "CREDIT REMARKS",
    "DEBIT REMARKS",
    "UNIQUE CUSTOMER REFERENCE NUMBER"
    ]
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type);
  XLSX.writeFile(workbook, `Nidhi_${type}_list_${formatDate(new Date().toISOString().split("T")[0])}.xlsx`);
}

