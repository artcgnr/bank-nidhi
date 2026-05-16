// dd/mm/yyyy hh:mm --------------------------
export function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  let d;
  if (timestamp.toDate) {
    d = timestamp.toDate();
  }
  else if (timestamp.seconds) {
    d = new Date(timestamp.seconds * 1000);
  }
  else if (typeof timestamp === "string" || typeof timestamp === "number") {
    d = new Date(timestamp);
  }
  else {
    return "-";
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// dd/mm/yyyy --------------------------
export function formatDate(timestamp) {
  if (!timestamp) return "-";
  let d;
  if (timestamp.toDate) {
    d = timestamp.toDate();
  }
  else if (timestamp.seconds) {
    d = new Date(timestamp.seconds * 1000);
  }
  else if (timestamp instanceof Date) {
    d = timestamp;
  }
  else if (typeof timestamp === "string" || typeof timestamp === "number") {
    d = new Date(timestamp);
  }
  else {
    return "-";
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}


// Get the currently logged-in user from localStorage
export const currentUser = JSON.parse(localStorage.getItem("loggedUser"));

// Redirect to login page if no user is found
if (!currentUser && !document.getElementById("signInBtn")) {
  window.location.href = "./";
}

// setings page show
export function settingsLinkOff() {
  const userpremition = getUserRole();
  const settingsLink = document.getElementById("settingsLink");
  if ((userpremition === "local" || userpremition === "admin") && settingsLink) {
    const anchor = settingsLink.querySelector("a");
    if (anchor) {
      anchor.removeAttribute("href");
    }
  }
};

//bank drop list
export function bankDropList() {
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


//branch drop list
export function branchDropList() {
  const branchSelect = document.getElementById("BranchName");
  if (!branchSelect) return;
  fetch("resources/branchlist.json")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      branchSelect.innerHTML = ` <option value="">All Branches</option> `;
      if (data && data.branchList) {
        data.branchList.forEach(branch => {
          const option = document.createElement("option");
          option.value = branch;
          option.textContent = branch;
          branchSelect.appendChild(option);
        });
      }
    })
    .catch(error => console.error("Error loading branch list:", error));
};

export function companyDetails() {
  const pageTitle = document.getElementById("pageTitle");
  const companyName = document.getElementById("companyName");
  return fetch("resources/firmdetails.json")
    .then(response => response.json())
    .then(data => {
      if (pageTitle) pageTitle.textContent = data.companyName + " - " + pageTitle.textContent;
      if (companyName) companyName.textContent = data.companyName;
      return data;
    })
    .catch(error => {
      console.error("Error loading firm details:", error);
      return null;
    });
}

//user permission 
export function getUserRole() {
  const id = localStorage.getItem("userid");
  if (id === "3") return "superadmin";
  if (id === "2") return "admin";
  if (id === "1") return "local";
  return "unknown";
}

