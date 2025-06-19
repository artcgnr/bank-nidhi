import { db, ref, set, get, onValue } from "./database.js";
import { checkAndSetBranchName } from './utils.js';

checkAndSetBranchName();

const form = document.getElementById("user_form");
const messageContainer = document.getElementById("messageContainer");
const tableReport = document.getElementById("userList");

let editingUserId = null;

// Convert user type id to name
function getUserGroupName(id) {
  switch (id) {
    case "1": return "Branch";
    case "2": return "Headoffice";
    case "3": return "Admin";
    default: return "Unknown";
  }
}

// Load existing users to table
const userRef = ref(db, `users`);
onValue(userRef, function(snapshot) {
  tableReport.innerHTML = "";

  if (snapshot.exists()) {
    const userArray = Object.entries(snapshot.val());
    userArray.forEach(([id, currentUserValue]) => {
      const groupName = getUserGroupName(currentUserValue.id);
      tableReport.innerHTML += `
        <tr class="user-row" data-id="${id}">
          <td>${currentUserValue.usernum}</td>
          <td>${currentUserValue.branch}</td>
          <td>${currentUserValue.username}</td>
          <td>${groupName}</td>
        </tr>`;
    });
  }
});

// Get next user ID
function getNextUserId() {
  const usersRef = ref(db, 'users');
  get(usersRef).then(snapshot => {
    if (snapshot.exists()) {
      const users = snapshot.val();
      const ids = Object.keys(users)
        .filter(key => key.startsWith("user"))
        .map(key => parseInt(key.replace("user", "")))
        .filter(num => !isNaN(num));

      const maxId = ids.length ? Math.max(...ids) : 0;
      const nextId = `user${maxId + 1}`;
      document.getElementById("userid").value = nextId;
    } else {
      document.getElementById("userid").value = "user1";
    }
  }).catch(error => {
    console.error("Error getting user IDs:", error);
    messageContainer.innerHTML = `<p class="error-message">Error loading user ID</p>`;
     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
  });
}

document.addEventListener("DOMContentLoaded", getNextUserId);

// Save New User
form.addEventListener("submit", function (e) {
  e.preventDefault();

    if (editingUserId) {    
    messageContainer.innerHTML = `<p class="error-message">UserId Not Found </p>`;
    return;
  }

  const name = document.getElementById("name").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const userGroup = document.getElementById("usergrop").value.trim();
  const userId = document.getElementById("userid").value.trim();

  if (!name || !username || !password || !confirmPassword || !userGroup) {
    messageContainer.innerHTML = `<p class="error-message">All fields must be filled out.</p>`;
     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    return;
  }

  if (password !== confirmPassword) {
    messageContainer.innerHTML = `<p class="error-message">Passwords do not match.</p>`;
     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    return;
  }

  const userData = {
    branch: name,
    id: userGroup,
    password: password,
    username: username,
    usernum: userId,
  };

  const userRef = ref(db, `users/${userId}`);
  messageContainer.innerHTML = `<p class="info-message">Saving</p>`;


  set(userRef, userData)
    .then(() => {
      messageContainer.innerHTML = `<p class="success-message">Saved</p>`;
       setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);

      form.reset();
      getNextUserId();
    })
    .catch(error => {
      console.error("Error saving data: ", error);
      messageContainer.innerHTML = `<p class="error-message">Not Saved: ${error.message}</p>`;

       setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    });
});

// Row Click to Populate for Update
tableReport.addEventListener("dblclick", function (e) {
  const row = e.target.closest(".user-row");
  if (row) {
    const userId = row.getAttribute("data-id");
    editingUserId = userId;

    get(ref(db, `users/${userId}`)).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById("userid").value = userId;
        document.getElementById("name").value = data.branch;
        document.getElementById("username").value = data.username;
        document.getElementById("password").value = data.password;
        document.getElementById("confirmPassword").value = data.password;
        document.getElementById("usergrop").value = data.id;
      }
    });
  }
});

// Update User
document.querySelector(".update").addEventListener("click", function (e) {
  e.preventDefault();

  if (!editingUserId) {
    messageContainer.innerHTML = `<p class="error-message">Please select a user to update.</p>`;

     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    return;
  }

  const name = document.getElementById("name").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const userGroup = document.getElementById("usergrop").value.trim();
  const userId = document.getElementById("userid").value.trim();

  if (!name || !username || !password || !confirmPassword || !userGroup) {
    messageContainer.innerHTML = `<p class="error-message">All fields must be filled out.</p>`;
     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    return;
  }

  if (password !== confirmPassword) {
    messageContainer.innerHTML = `<p class="error-message">Passwords do not match.</p>`;
     setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    return;
  }

  const userData = {
    branch: name,
    id: userGroup,
    password: password,
    username: username,
    usernum: userId,
  };

  set(ref(db, `users/${editingUserId}`), userData)
    .then(() => {
      messageContainer.innerHTML = `<p class="success-message">Updated successfully!</p>`;
       setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
      form.reset();
      editingUserId = null;
      getNextUserId();
    })
    .catch((error) => {
      console.error("Error updating data: ", error);
      messageContainer.innerHTML = `<p class="error-message">Update failed: ${error.message}</p>`;
       setTimeout(() => {    
             messageContainer.innerHTML = "";
         }, 3000);
    });
});

document.querySelector(".clear").addEventListener("click", () => {
  editingUserId = null;
  getNextUserId();
});

document.getElementById('nameSearch').addEventListener('keyup', function () {
    const filter = this.value.toLowerCase();
    const rows = document.querySelectorAll('#userList tr');

    rows.forEach(row => {
        const nameCell = row.cells[1]; // index 1 = Name column
        if (nameCell) {
            const nameText = nameCell.textContent.toLowerCase();
            row.style.display = nameText.includes(filter) ? '' : 'none';
        }
    });
});