import { db, ref, push, set, onValue } from "./database.js";
import { branchDropList, checkAndSetBranchName,getCurrentDate } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
      branchDropList();
      checkAndSetBranchName();


const bankSelect = document.getElementById('bankName');
const transferTypeSelect = document.getElementById('transferType');
const accountInput = document.getElementById('confirmAccountNumber');
const confirmInput = document.getElementById('accountNumber');
const costcenter = document.getElementById('hidbranchName');

const todayDate = getCurrentDate();

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
document.getElementById('transferForm').addEventListener('submit', (e) => {
  const acc = accountInput.value.trim();
  const confirmAcc = confirmInput.value.trim();

if (acc !== confirmAcc) {
  e.preventDefault();
  Swal.fire({
    icon: 'error',
    title: 'Oops..!',
    text: 'Account numbers do not match. Please re-enter.',
  });
  return;
}

  e.preventDefault();
  const data = {
    accountNumber: acc,
    bankName: document.getElementById('bankName').value,
    ifscCode: document.getElementById('ifscCode').value,
    transferType: document.getElementById('transferType').value,
    pledgeNumber: document.getElementById('pledgeNumber').value,
    branch: document.getElementById('hidbranchName').value,
    amount: parseFloat(document.getElementById('amount').value),
    BeneficiaryName: document.getElementById('BeneficiaryName').value,
    date: todayDate,
    status: "Pending",
  };

  const newRef = push(ref(db, `transfers/${costcenter.value}`));
  set(newRef, data)
    .then(() => {
      Swal.fire({    
        icon: 'success',    
        title: 'Success..!',    
        text: 'Transfer entry submitted successfully!',  
      });

      document.getElementById('transferForm').reset();
      transferTypeSelect.disabled = false; 
    })

    .catch((error) => {
      console.error("Error saving transfer:", error);            
      Swal.fire({    
        icon: 'error',    
        title: 'Oops..!',   
        text: 'Failed to submit. Try again.',
        });      
    });
});

const cost_center = document.getElementById("costcenter");
const tableReport = document.getElementById("tableBody");
const newRef = ref(db, `transfers/${cost_center.value}`);


onValue(newRef, function(snapshot) {
  tableReport.innerHTML = "";

  if (snapshot.exists()) {
    const userArray = Object.entries(snapshot.val());
    userArray.forEach(([id, currentUserValue]) => {
      if (currentUserValue.date === todayDate) {  
        tableReport.innerHTML += `
          <tr>
            <td>${currentUserValue.pledgeNumber}</td>    
            <td>${currentUserValue.BeneficiaryName}</td>    
            <td>${currentUserValue.accountNumber}</td>    
            <td>${currentUserValue.ifscCode}</td>    
            <td>${currentUserValue.transferType}</td>    
            <td>₹${currentUserValue.amount}</td>
            <td><b>${currentUserValue.status}</b></td>
          </tr>`;
      }
    });
  }
});
});