import { db, doc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, Timestamp } from "./database.js";
import { formatDate, formatDateTime, currentUser } from "./utils.js";

document.getElementById('branchNamehid').innerHTML = currentUser.branchId;
document.addEventListener("DOMContentLoaded", () => {

  ['pending', 'approved', 'sent', 'rejected'].forEach(type => {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById(`fromdate_${type}`).value = today;
    document.getElementById(`todate_${type}`).value = today;
  });

  fetchData();

  document.querySelectorAll('.filter-button').forEach(btn => {
    btn.addEventListener('click', () => {
      fetchData(btn.dataset.type);
    });
  });
});

let unsubscribe = null;
let isFirstLoad = true;
let listenerStartedAt = null;
let seenTransferIds = new Set();

const notificationSound = new Audio('./audio/2.mp3');
function fetchData(tabType = null) {

  if (unsubscribe) unsubscribe();
  listenerStartedAt = Timestamp.now();
  if (unsubscribe) unsubscribe();

  const types = tabType ? [tabType] : ['pending', 'approved', 'sent', 'rejected'];
  types.forEach(t => document.getElementById(`${t}List`).innerHTML = '');

  const fromInput = document.getElementById(`fromdate_${types[0]}`).value;
  const toInput = document.getElementById(`todate_${types[0]}`).value;

  const fromDate = new Date(fromInput);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(toInput);
  toDate.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, "transfers"),
    where("createdAt", ">=", Timestamp.fromDate(fromDate)),
    where("createdAt", "<=", Timestamp.fromDate(toDate))
  );

  unsubscribe = onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {

      if (change.type !== "added") return;
      const data = change.doc.data();
      if (!data.createdAt || data.createdAt.seconds <= listenerStartedAt.seconds)
        return;
      showToast(`🔔 New transfer from ${data.branch}`);
      notificationSound.play().catch(() => { });
    });

    types.forEach(t => {
      const container = document.getElementById(`${t}List`);
      const table = container.querySelector('table');
      if (table) table.querySelector('tbody').innerHTML = '';
    });

    const allRows = {
      pending: [],
      approved: [],
      sent: [],
      rejected: []
    };

    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const id = docSnap.id;

      if (item.status === "Pending")
        allRows.pending.push({ item, id });
      else if (item.status === "Approved" && !item.isSent)
        allRows.approved.push({ item, id });
      else if (item.status === "completed" && item.isSent)
        allRows.sent.push({ item, id });
      else if (item.status === "Rejected" || item.status === "Bank Rejected")
        allRows.rejected.push({ item, id });
    });

    types.forEach(type => {
      allRows[type]
        .sort((a, b) => a.item.createdAt?.seconds - b.item.createdAt?.seconds)
        .forEach(r => {
          renderRow(
            r.item,
            r.id,
            `${type}List`,
            type.charAt(0).toUpperCase() + type.slice(1)
          );
        });
    });

    isFirstLoad = false;
  });

}
function renderRow(item, docId, containerId, statusFilter) {
  const container = document.getElementById(containerId);
  let table = container.querySelector('table');

  if (!table) {
    table = document.createElement('table');
    table.className = 'table-container';
    table.innerHTML = `     
      <thead>
        <tr>
          <th>Branch</th>
          <th>Date</th>
          <th>Pledge</th>
          <th>Beneficiary</th>
          <th>Account</th>
          <th>IFSC</th>
          <th>Mode</th>
          <th>Amount</th>
          <th>Actions</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody></tbody>      
    `;
    container.appendChild(table);
  }

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${item.branch}</td>
    <td>${formatDate(item.createdAt)}</td>
    <td>${item.pledgeNumber}</td>
    <td>${item.BeneficiaryName}</td>
    <td>${item.accountNumber}</td>
    <td>${item.ifscCode}</td>
    <td>${item.transferType}</td>
    <td>₹${item.amount}</td>
    <td id="act-${docId}"></td>
    <td class="created-at">${formatDateTime(item.createdAt)}</td>
  `;
  const act = row.querySelector(`#act-${docId}`);

  if (statusFilter === 'Pending') {
    act.innerHTML = `
      <button class="btn btn-approved" onclick="updateStatus('${docId}','Approved')">Approve</button>
      <button class="btn btn-rejected" onclick="updateStatus('${docId}','Rejected')">Reject</button>`;
  }
  if (statusFilter === 'Approved') {
    act.innerHTML = `
      <button class="btn btn-completed" onclick="markAsSent('${docId}')">Completed</button>
      <button class="btn btn-rejected" onclick="updateStatus('${docId}','Bank Rejected')">Reject</button>`;
  }
  if (statusFilter === 'Sent') {
    act.innerHTML = `
     ${item.isSent ? `<div class="task-cell">Approved By: <b>${item.approvedBy || '-'}(${item.approvedAt ? formatDateTime(item.approvedAt) : '-'})</b></div>` : ''}
      ${item.isSent ? `<div class="task-cell">Completed By: <b>${item.CompletedBy || '-'}(${item.completedAt ? formatDateTime(item.completedAt) : '-'})</b></div>` : ''}
    `;
  }
  if (statusFilter === 'Rejected') {
    act.innerHTML = `<div class="task-cell">Rejected By: <b>${item.approvedBy || '-'}</b></div>
                    <div class="task-cell"><b>${item.status || '-'}</b></div>  `;
  }

  container.querySelector('tbody').appendChild(row);
}
window.updateStatus = async (docId, status) => {
  await updateDoc(doc(db, "transfers", docId), {
    status,
    approvedBy: currentUser.username,
    approvedAt: serverTimestamp()
  });
};
window.markAsSent = async (docId) => {
  await updateDoc(doc(db, "transfers", docId), {
    status: "completed",
    isSent: true,
    CompletedBy: currentUser.username,
    completedAt: serverTimestamp()
  });
};
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
window.exportToExcel = function (type) {
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
      "DEBIT REMARKS": (cells[0]?.textContent.trim() || "").toUpperCase() + " _GL_" + (cells[2]?.textContent.trim() || "").toLocaleUpperCase(),
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

