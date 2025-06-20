import { db, ref, onValue, update } from "./database.js";
import { checkAndSetBranchName, formatDate } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  checkAndSetBranchName();
  fetchData();
});

let seenTransferIds = new Set();
let isFirstLoad = true;
const notificationSound = new Audio('https://www.soundjay.com/buttons/sounds/button-1.mp3');

function fetchData() {
  const dbRef = ref(db, 'transfers');

  onValue(dbRef, snapshot => {
    const allCenters = snapshot.val();
    if (!allCenters) {
      console.warn("⚠️ No transfer data available.");
      return;
    }

    // Clear containers
    document.getElementById('pendingList').innerHTML = '';
    document.getElementById('approvedList').innerHTML = '';
    document.getElementById('sentList').innerHTML = '';
    document.getElementById('rejectedList').innerHTML = '';

    // Render
  Object.entries(allCenters).forEach(([center, transfers]) => {
      Object.entries(transfers).forEach(([id, item]) => {
        const fullId = `${center}/${id}`;
        const status = item.status;

        // ✅ First-time skip notifications but track
        if (!seenTransferIds.has(fullId)) {
          seenTransferIds.add(fullId);
          if (!isFirstLoad) {
            showToast(`🔔 New transfer submitted by ${item.branch}`);
            notificationSound.play();
          }
        }

        if (status === 'Pending') {
          renderRow(item, fullId, 'pendingList', 'Pending');
        } else if (status === 'Approved' && !item.isSent) {
          renderRow(item, fullId, 'approvedList', 'Approved', false);
        } else if (status === 'completed') {
          renderRow(item, fullId, 'sentList', 'completed', true);
        } else if (status === 'Rejected') {
          renderRow(item, fullId, 'rejectedList', 'Rejected');
        }
      });
    });
    isFirstLoad = false;

  });
}

// Render individual row
function renderRow(item, fullId, containerId, statusFilter, isSentFilter = null) {
  const container = document.getElementById(containerId);
  let table = container.querySelector('table');

if (!table) {
  const wrapper = document.createElement('div');
  wrapper.style.overflowX = 'auto'; 
  wrapper.style.maxWidth = '100%'; 
  wrapper.style.height = '450px';

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
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

  const tbody = table.querySelector('tbody');
  const row = document.createElement('tr');
  const idAttr = fullId.replace(/\//g, '_');

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
    <td id="actions-${idAttr}"></td>
   </tr> 
  `;

  const actionsCell = row.querySelector(`#actions-${idAttr}`);

  if (statusFilter === 'Pending') {
    actionsCell.innerHTML = `
      <button class="action-button btn-approve" onclick="updateStatus('${fullId}', 'Approved')">Approve</button>
      <button class="action-button btn-reject" onclick="updateStatus('${fullId}', 'Rejected')">Reject</button>
    `;
  } else if (statusFilter === 'Approved' && isSentFilter === false) {
    actionsCell.innerHTML = `
      <button class="action-button btn-send" onclick="markAsSent('${fullId}', 'completed')">Mark as Sent</button>
    `;
  } else {
    actionsCell.textContent = '-';
  }

  tbody.appendChild(row);
}

// Update status (Approve / Reject)
window.updateStatus = function (fullId, newStatus) {
  const [center, id] = fullId.split('/');
  const transferRef = ref(db, `transfers/${center}/${id}`);
  update(transferRef, { status: newStatus });
};

// Mark as sent
window.markAsSent = function (fullId, newStatus) {
  const [center, id] = fullId.split('/');
  const transferRef = ref(db, `transfers/${center}/${id}`);
  update(transferRef, { status: newStatus, isSent: true });
};

// Simple toast function
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}


// Approve or Reject transfer
window.updateStatus = function(fullId, status) {
  const updateData = { status };
  if (status === 'Approved') ;

  const itemRef = ref(db, 'transfers/' + fullId);
  update(itemRef, updateData).catch(err => {
    alert("Failed to update status: " + err.message);
  });
}

// Mark approved transfer as sent
window.markAsSent = function(id, status) {
  const markAsData = {
    status,
    isSent: true 
  };

  const itemRef = ref(db, 'transfers/' + id);
  update(itemRef, markAsData).catch(err => {
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

