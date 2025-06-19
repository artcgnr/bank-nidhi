//date dd/mm/yyyy format
export function formatDate(dateString) {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

//branch name 
export function checkAndSetBranchName() {
    const branchName = localStorage.getItem('brName');

    if (branchName) {
        const nameDisplay = document.getElementById('branchNamehid');
        const nameInput = document.getElementById('hidbranchName');
        const costcenter = document.getElementById('costcenter');

        if (nameDisplay) nameDisplay.textContent = branchName;
        if (nameInput) nameInput.value = branchName;
        if (costcenter) costcenter.value = branchName;
    } else {
        window.location.href = './';
    }
}

// current date get
export function getCurrentDate() {
    return new Date().toISOString().split("T")[0];
}

//report baranch input show
export function hideBranchBoxIfAdmin() {
  const userpremition = localStorage.getItem('userId');
  const branchnameel = document.getElementById("branchname"); 
  const tableth = document.getElementById("dlt_th_btn");

  if (userpremition === "1") {
    if (branchnameel) branchnameel.style.display = 'none';
    if (tableth) tableth.style.display = 'none';
  }
}

// setings page show
export function settingsLinkOff(){
const userpremition = getUserRole();
    const settingsLink = document.getElementById("settingsLink");
    if ((userpremition === "local" || userpremition === "2") && settingsLink) {
    const anchor = settingsLink.querySelector("a"); 
    if (anchor) {  
        anchor.removeAttribute("href");
    }
  }
};

//bank drop list
export function branchDropList() {    
    const bankSelect = document.getElementById("bankName");    
    fetch("resources/droplist.json")        
    .then(response => response.json())        
    .then(data => {            
        bankSelect.innerHTML = ` <option value="">Select Bank</option> `;            
        data.bankList.forEach(bank => {                
            const option = document.createElement("option");                
            option.value = bank;                
            option.textContent = bank;               
            bankSelect.appendChild(option);            
        });
    })        
    .catch(error => console.error("Error loading branches:", error));
};

//user permission 
export function getUserRole() {
  const id = localStorage.getItem("userId");
  if (id === "3") return "superadmin";
  if (id === "2") return "admin";
  if (id === "1") return "local";
  return "unknown";
}

