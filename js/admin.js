import { db, doc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, Timestamp } from "./database.js";
import { formatDate, formatDateTime, currentUser, branchDropList, companyDetails } from "./utils.js";

document.getElementById('branchNamehid').innerHTML = currentUser.branchId;
document.addEventListener("DOMContentLoaded", () => {
  branchDropList();
  companyDetails();
  ['pending', 'approved', 'sent', 'rejected', 'bankCharges'].forEach(type => {
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

let unsubscribes = {};
let isFirstLoad = true;
let listenerStartedAt = null;
let seenTransferIds = new Set();

const notificationSound = new Audio('./audio/2.mp3');
function fetchData(tabType = null) {

  if (!listenerStartedAt) {
    listenerStartedAt = Timestamp.now();
  }

  const types = tabType ? [tabType] : ['pending', 'approved', 'sent', 'rejected', 'bankCharges'];

  types.forEach(type => {
    if (unsubscribes[type]) {
      unsubscribes[type]();
      unsubscribes[type] = null;
    }

    const fromInput = document.getElementById(`fromdate_${type}`).value;
    const toInput = document.getElementById(`todate_${type}`).value;

    const fromDate = new Date(fromInput);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(toInput);
    toDate.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "transfers"),
      where("createdAt", ">=", Timestamp.fromDate(fromDate)),
      where("createdAt", "<=", Timestamp.fromDate(toDate))
    );

    unsubscribes[type] = onSnapshot(q, snapshot => {
      if (type === 'pending') {
        snapshot.docChanges().forEach(change => {
          if (change.type !== "added") return;
          const data = change.doc.data();
          if (!data.createdAt || data.createdAt.seconds <= listenerStartedAt.seconds) return;
          
          if (!seenTransferIds.has(change.doc.id)) {
            seenTransferIds.add(change.doc.id);
            showToast(`🔔 New transfer from ${data.branch}`);
            notificationSound.play().catch(() => { });
          }
        });
      }

      const rows = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const id = docSnap.id;
        const status = (item.status || "").toLowerCase();

        if (type === "pending" && status === "pending") {
          rows.push({ item, id });
        } else if (type === "approved" && status === "approved" && !item.isSent) {
          rows.push({ item, id });
        } else if (type === "sent" && status === "completed" && item.isSent) {
          rows.push({ item, id });
        } else if (type === "rejected" && (status === "rejected" || status === "bank rejected")) {
          rows.push({ item, id });
        } else if (type === "bankCharges" && status === "completed" && item.bankCharge && Number(item.bankCharge) > 0) {
          const branchFilter = document.getElementById('BranchName')?.value;
          if (!branchFilter || item.branch === branchFilter) {
            rows.push({ item, id });
          }
        }
      });

      console.log(`Data loaded for ${type}: ${rows.length} rows`);

      const container = document.getElementById(`${type}List`);
      if (!container) return;

      let table = container.querySelector('table');
      if (!table) {
        table = createTableStructure(type);
        container.innerHTML = ''; 
        container.appendChild(table);
      }

      const tbody = table.querySelector('tbody');
      tbody.innerHTML = ''; 

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11">No data found</td></tr>';
        if (type === 'bankCharges') {
          const totalElem = document.getElementById('totalBankCharges');
          if (totalElem) {
            totalElem.textContent = `₹0.00`;
          }
        }
      } else {
        let totalCharges = 0;
        rows.sort((a, b) => (a.item.createdAt?.seconds || 0) - (b.item.createdAt?.seconds || 0))
          .forEach(r => {
            const row = createRowHTML(r.item, r.id, type.charAt(0).toUpperCase() + type.slice(1));
            tbody.appendChild(row);
            if (type === 'bankCharges') {
              totalCharges += Number(r.item.bankCharge || 0);
            }
          });
        
        if (type === 'bankCharges') {
          const totalElem = document.getElementById('totalBankCharges');
          if (totalElem) {
            totalElem.textContent = `₹${totalCharges.toFixed(2)}`;
          }
        }
      }
    }, error => {
      console.error(`Firestore Snapshot Error for ${type}:`, error);
      showToast("⚠️ Connection error. Please refresh.");
    });
  });

  isFirstLoad = false;
}
function createTableStructure(type) {
  const table = document.createElement('table');
  table.className = 'table-container';
  const hideStyle = type === 'bankCharges' ? 'style="display:none;"' : '';
  table.innerHTML = `     
    <thead>
      <tr>
        <th>Branch</th>
        <th>Date</th>
        <th>Pledge</th>
        <th ${hideStyle}>Beneficiary</th>
        <th ${hideStyle}>Account</th>
        <th ${hideStyle}>IFSC</th>
        <th ${hideStyle}>Mode</th>
        <th>Amount</th>
        <th>Bank Charge</th>
        <th ${hideStyle}>Actions</th>
        <th ${hideStyle}>Created</th>
      </tr>
    </thead>
    <tbody></tbody>      
  `;
  return table;
}

function createRowHTML(item, docId, statusFilter) {
  const row = document.createElement('tr');
  const hideStyle = statusFilter === 'BankCharges' ? 'style="display:none;"' : '';
  row.innerHTML = `
    <td>${item.branch}</td>
    <td>${formatDate(item.createdAt)}</td>
    <td>${item.pledgeNumber}</td>
    <td ${hideStyle}>${item.BeneficiaryName}</td>
    <td ${hideStyle}>${item.accountNumber}</td>
    <td ${hideStyle}>${item.ifscCode}</td>
    <td ${hideStyle}>${item.transferType}</td>
    <td>₹${item.amount}</td>
    <td>${item.bankCharge || ""}</td>
    <td id="act-${docId}" ${hideStyle}></td>
    <td class="created-at" ${hideStyle}>${formatDateTime(item.createdAt)}</td>
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

  return row;
}
window.updateStatus = async (docId, status) => {
  try {
    await updateDoc(doc(db, "transfers", docId), {
      status,
      approvedBy: currentUser.username,
      approvedAt: serverTimestamp()
    });
    showToast(`✅ Transfer ${status}`);
  } catch (error) {
    console.error("Update Status Error:", error);
    showToast("❌ Failed to update status.");
  }
};
window.markAsSent = async (docId) => {
  try {
    await updateDoc(doc(db, "transfers", docId), {
      status: "completed",
      isSent: true,
      CompletedBy: currentUser.username,
      completedAt: serverTimestamp()
    });
    showToast("✅ Transfer Completed");
  } catch (error) {
    console.error("Mark As Sent Error:", error);
    showToast("❌ Failed to mark as completed.");
  }
};
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
window.exportToExcel = async function (type) {
  const container = document.getElementById(type + 'List');
  const table = container.querySelector('table');

  if (!table) {
    alert("No data available to export.");
    return;
  }

  let firmDetails = { bankAccount: "10240200011278", companyName: "CHENGANNUR NIDHI" };
  try {
    const res = await fetch("resources/firmdetails.json");
    if (res.ok) {
      firmDetails = await res.json();
    }
  } catch (error) {
    console.error("Error fetching firm details:", error);
  }

  const rows = [];
  const tbodyRows = table.querySelectorAll('tbody tr');

  tbodyRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const data = {
      "TRANSACTION TYPE": (cells[6]?.textContent.trim() || "").toUpperCase(),
      "DEBIT ACCOUNT NUMBER": firmDetails.bankAccount,
      "TRANSACTION AMOUNT": (cells[7]?.textContent.replace('₹', '').trim() || "").toUpperCase(),
      "VALUE DATE": formatDate(new Date().toISOString().split("T")[0]).toUpperCase(),
      "BENEFICIARY ACCOUNT NUMBER": (cells[4]?.textContent.trim() || "").toUpperCase(),
      "BENEFICIARY NAME": (cells[3]?.textContent.trim() || "").toUpperCase(),
      "IFSC CODE": (cells[5]?.textContent.trim() || "").toUpperCase(),
      "BENEFICIARY EMAIL ID": "",
      "BENEFICIARY ID": "",
      "CREDIT REMARKS": (firmDetails.companyName || "").toUpperCase(),
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

