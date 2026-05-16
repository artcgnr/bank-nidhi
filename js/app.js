import { db, getDoc, doc, addDoc, setDoc, collection, onSnapshot, query, where, serverTimestamp, Timestamp, runTransaction } from "./database.js";
import { bankDropList, formatDateTime, currentUser, formatDate, companyDetails } from "./utils.js";

// New Transfer Popup --------------
const popupTransfer = document.getElementById('TransferPopup');
const transferTypeSelect = document.getElementById('transferType');
// --- Bank Charge Logic for IMPS ---
const transferForm = document.getElementById('transferForm');
const newTransBtn = document.getElementById('newTransaction');
const closeModal = document.getElementById('close');
const clearBtn = document.getElementById('clearBtn');

newTransBtn?.addEventListener('click', async () => {
  document.getElementById("popupMessage").style.display = "none";
  transferForm.reset();
  popupTransfer.style.display = 'flex';

  // Set current date
  document.getElementById("date").value = formatDate(new Date());
  document.getElementById("date").disabled = true;

  const predictedCode = await getPredictedTransferCode();
  document.getElementById("code").value = predictedCode;
  document.getElementById("code").disabled = true;
});
closeModal?.addEventListener('click', () => {
  document.getElementById("popupMessage").style.display = "none";
  transferForm.reset();
  popupTransfer.style.display = 'none';
});
clearBtn?.addEventListener('click', () => {
  document.getElementById("popupMessage").style.display = "none";
  transferForm.reset();
  popupTransfer.style.display = 'none';
});

async function generateTransferCode() {
  const counterRef = doc(db, "counters", `TransferCode_${currentUser.code}`);

  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);

    let current = 0;
    if (snap.exists()) {
      current = snap.data().value || 0;
    }
    const next = current + 1;
    transaction.set(counterRef, { value: next }, { merge: true });
    return next;
  });

  return `${currentUser.code}/${String(nextNumber).padStart(3, "0")}`;
}

async function getPredictedTransferCode() {
  const counterRef = doc(db, "counters", `TransferCode_${currentUser.code}`);
  const snap = await getDoc(counterRef);
  let current = 0;
  if (snap.exists()) {
    current = snap.data().value || 0;
  }
  const next = current + 1;
  return `${currentUser.code}/${String(next).padStart(3, "0")}`;
}


document.addEventListener("DOMContentLoaded", async () => {
  bankDropList();
  let firmDetails = await companyDetails();
  document.getElementById('accountNumber').value = firmDetails.bankAccount;

  function showPopupMessage(message, type = "success") {
    const overlay = document.getElementById("popupMessage");
    const text = document.getElementById("popupMessageText");
    const box = document.getElementById("popupMessageBox");
    const closeBtn = document.getElementById("closeMssg");
    const img = document.getElementById("mssgImg");

    img.style.display = "none";
    text.textContent = message;

    box.style.borderLeft =
      type === "error" ? "4px solid red" : "4px solid green";
    if (type === "Done") {
      closeBtn.style.display = "none";
      img.style.display = "flex";

      setTimeout(() => {
        document.getElementById('TransferPopup').style.display = 'none';
      }, 2000);

    } else {
      closeBtn.style.display = "flex";
    }
    overlay.style.display = "flex";
  }
  function closePopupMessage() {
    document.getElementById("popupMessage").style.display = "none";
  }
  const closeMssgBtn = document.getElementById("closeMssg");
  closeMssgBtn.addEventListener("click", closePopupMessage);

  document.getElementById('branchNamehid').textContent = currentUser.branchId;

  const bankSelect = document.getElementById('bankName');
  // --- Bank Charge Logic for IMPS ---
  const bankChargeElem = document.getElementById('bankCharge');

  // Charge chart data (from, to, charge)
  const bankChargeChart = [
    { from: 1, to: 10000, charge: 6 },
    { from: 10001, to: 20000, charge: 12 },
    { from: 20001, to: 30000, charge: 18 },
    { from: 30001, to: 40000, charge: 24 },
    { from: 40001, to: 50000, charge: 30 },
    { from: 50001, to: 60000, charge: 36 },
    { from: 60001, to: 70000, charge: 42 },
    { from: 70001, to: 80000, charge: 48 },
    { from: 80001, to: 90000, charge: 54 },
    { from: 90001, to: 100000, charge: 60 },
    { from: 100001, to: 110000, charge: 66 },
    { from: 110001, to: 120000, charge: 72 },
    { from: 120001, to: 130000, charge: 78 },
    { from: 130001, to: 140000, charge: 84 },
    { from: 140001, to: 150000, charge: 90 },
    { from: 150001, to: 160000, charge: 96 },
    { from: 160001, to: 170000, charge: 102 },
    { from: 170001, to: 180000, charge: 108 },
    { from: 180001, to: 190000, charge: 114 },
    { from: 190001, to: 199999, charge: 120 },
  ];

  function getBankCharge(amount) {
    const val = Number(amount);
    for (const row of bankChargeChart) {
      if (val >= row.from && val <= row.to) {
        return row.charge;
      }
    }
    return null;
  }

  function updateBankCharge() {
    if (transferTypeSelect.value === 'IMPS') {
      const charge = getBankCharge(document.getElementById('amount').value);
      if (charge !== null) {
        bankChargeElem.textContent = `Bank Charge: ₹${charge}`;
        bankChargeElem.style.display = 'block';
      } else {
        bankChargeElem.textContent = '';
        bankChargeElem.style.display = 'none';
      }
    } else {
      bankChargeElem.textContent = '';
      bankChargeElem.style.display = 'none';
    }
  }

  // Listen for changes in amount and transfer type
  document.getElementById('amount')?.addEventListener('input', () => {
    updateBankCharge();
    enforceTransferType();
  });
  transferTypeSelect?.addEventListener('change', () => {
    updateBankCharge();
    enforceTransferType();
  });

  // Enforce RTGS for amounts > 199999 (excluding IFT)
  function enforceTransferType() {
    const amountVal = Number(document.getElementById('amount').value);
    const neftMsg = document.getElementById('Neft_message');
    const currentType = transferTypeSelect.value;

    if (amountVal > 199999 && currentType !== 'IFT') {
      if (currentType !== 'RTGS') {
        transferTypeSelect.value = 'RTGS';
      }
      neftMsg.textContent = 'Amount exceeds 199,999. Transfer Type forced to RTGS.';
      neftMsg.style.display = 'block';
    } else {
      neftMsg.textContent = '';
      neftMsg.style.display = 'none';
    }
  }

  // Initial call in case defaults are set
  updateBankCharge();
  // Ensure listener for transfer type change updates charge display
  // Removed duplicate listener

  const accountInput = document.getElementById('confirmAccountNumber');
  const confirmInput = document.getElementById('accountNumber');

  // Lock transferType if bank is Federal Bank
  bankSelect.addEventListener('change', () => {
    if (bankSelect.value === "Federal Bank") {
      transferTypeSelect.value = "IFT";
      transferTypeSelect.disabled = true;
    } else {
      transferTypeSelect.disabled = false;
      if (transferTypeSelect.value === "IFT") transferTypeSelect.value = "";
    }
  });

  // Form submission
  const submitBtn = document.getElementById("submitBtn");
  document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn.disabled) return;
    submitBtn.disabled = true;

    const acc = accountInput.value.trim();
    const confirmAcc = confirmInput.value.trim();

    // Account number match validation
    if (acc !== confirmAcc) {
      showPopupMessage("Account numbers do not match. Please re-enter.", "error");
      submitBtn.disabled = false;
      return;
    }

    try {
      const code = await generateTransferCode();

      const data = {
        code: code,
        userid: currentUser.id,
        accountNumber: acc,
        bankName: document.getElementById('bankName').value,
        ifscCode: document.getElementById('ifscCode').value,
        transferType: document.getElementById('transferType').value,
        pledgeNumber: document.getElementById('pledgeNumber').value,
        branch: currentUser.branchId,
        amount: Number(document.getElementById('amount').value),
        bankCharge: document.getElementById('transferType').value === 'IMPS' ? (getBankCharge(document.getElementById('amount').value) || 0) : 0,
        BeneficiaryName: document.getElementById('BeneficiaryName').value,
        status: "Pending",
        createdAt: serverTimestamp()
      };

      // Use code as document ID, replacing slashes to prevent subcollection creation
      const docId = code.replace(/\//g, '_');
      await setDoc(doc(db, "transfers", docId), data);

      showPopupMessage("New Bank Transfer Added. Please wait for approval.", "Done");

      document.getElementById('transferForm').reset();
      transferTypeSelect.disabled = false;
      document.getElementById('transferForm').reset();
      transferTypeSelect.disabled = false;

      const newCode = await getPredictedTransferCode();
      document.getElementById("code").value = newCode;

    } catch (error) {
      console.error(error);
      showPopupMessage("Error saving transfer. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
});

// Today's transfers report
const tableReport = document.getElementById("tableBody");

const filterFromDate = document.getElementById("fromDate");
const filterToDate = document.getElementById("toDate");
const filterBtn = document.getElementById("filterBtn");

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  filterFromDate.value = today;
  filterToDate.value = today;
}
setTodayDate();

let unsubscribe = null;
function loadTransfersByDate(fromDate, toDate) {

  if (!currentUser || !currentUser.branchId) {
    console.warn("Branch not ready yet, skipping query");
    return;
  }

  if (unsubscribe) unsubscribe();

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  const transfersRef = collection(db, "transfers");

  const q = query(
    transfersRef,
    where("branch", "==", currentUser.branchId),
    where("createdAt", ">=", Timestamp.fromDate(from)),
    where("createdAt", "<=", Timestamp.fromDate(to))
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    tableReport.innerHTML = "";

    if (snapshot.empty) {
      tableReport.innerHTML = `
        <tr><td colspan="9" style="text-align:center;">No data found</td></tr>`;
      return;
    }

    snapshot.forEach((doc) => {
      const d = doc.data();

      tableReport.innerHTML += `
        <tr>
          <td style="text-transform: uppercase;">${d.code || ""}</td>
          <td>${d.pledgeNumber || ""}</td>
          <td>${d.BeneficiaryName || ""}</td>
          <td>${d.accountNumber || ""}</td>
          <td>${d.ifscCode || ""}</td>
          <td>${d.transferType || ""}</td>
          <td>₹${Number(d.amount || 0).toFixed(2)}</td>
          <td>${d.bankCharge || ""}</td>
          <td>
            <b class="${d.status === "Pending" ? "status-pending"
          : d.status === "Approved" ? "status-approved"
            : d.status === "Completed" ? "status-completed"
              : d.status === "Rejected" || d.status === "Bank Rejected" ? "status-rejected"
                : ""
        }">${d.status}</b>
          </td>
          <td style="font-size: 10px;" >${formatDateTime(d.createdAt)}</td>
        </tr>
      `;
    });
  }, error => {
    console.error("Firestore Snapshot Error:", error);
    if (tableReport) {
      tableReport.innerHTML = `<tr><td colspan="10" style="text-align:center; color: red;">Error loading data: ${error.message}</td></tr>`;
    }
  });
}

function waitForBranchAndLoad() {
  if (currentUser && currentUser.branchId) {
    loadTransfersByDate(filterFromDate.value, filterToDate.value);
  } else {
    setTimeout(waitForBranchAndLoad, 100);
  }
}

waitForBranchAndLoad();

filterBtn.addEventListener("click", () => {
  if (!filterFromDate.value || !filterToDate.value) {
    alert("Please select both dates");
    return;
  }

  loadTransfersByDate(
    filterFromDate.value,
    filterToDate.value
  );
});

