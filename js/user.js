import { db, collection, doc, setDoc, updateDoc, getDoc, getDocs, onSnapshot, query, orderBy } from "./database.js";
import { currentUser } from "./utils.js";

document.getElementById('branchNamehid').textContent = currentUser.branchId;

const form = document.getElementById("user_form");
const messageContainer = document.getElementById("messageContainer");
const tableReport = document.getElementById("userList");

let editingUserId = null;

// Load existing users to table
const usersCol = collection(db, "users");
const q = query(usersCol, orderBy("usernum"));

onSnapshot(q, snapshot => {
  tableReport.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    tableReport.innerHTML += `
      <tr class="user-row" data-id="${docSnap.id}">
        <td>${data.usernum}</td>
        <td>${data.code}</td>
        <td>${data.branchId}</td>
        <td>${data.username}</td>
        <td>${data.role}</td>
        <td><button class="btn reset-device" data-id="${docSnap.id}">Reset Device</button></td>
      </tr>
    `
  });
});
// Reset Device
tableReport.addEventListener("click", async (e) => {
  if (e.target.classList.contains("reset-device")) {
    const userDocId = e.target.getAttribute("data-id");
    if (!userDocId) return;
    const confirmReset = confirm("Reset device for this user?");
    if (!confirmReset) return;
    try {
      await updateDoc(doc(db, "users", userDocId), {
        deviceId: null
      });
      messageContainer.innerHTML =
        `<p class="success-message">Device reset successfully</p>`;
      setTimeout(() => {
        messageContainer.innerHTML = "";
      }, 3000);

    } catch (error) {
      console.error("Reset failed:", error);
      messageContainer.innerHTML =
        `<p class="error-message">Reset failed</p>`;

      setTimeout(() => {
        messageContainer.innerHTML = "";
      }, 3000);
    }
  }
});


// Get next user ID
async function getNextUserId() {
  try {
    const snap = await getDocs(usersCol);

    let max = 0;
    snap.forEach(doc => {
      const num = parseInt(doc.data().usernum?.replace("user", ""));
      if (!isNaN(num)) max = Math.max(max, num);
    });

    document.getElementById("userid").value = `user${max + 1}`;
  } catch (err) {
    messageContainer.innerHTML = `<p class="error-message">Error loading user ID</p>`;
  }
}
document.addEventListener("DOMContentLoaded", getNextUserId);


// Save New User
const nameInput = document.getElementById("name");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const userGroupInput = document.getElementById("usergrop");
const userIdInput = document.getElementById("userid");
const codeInput = document.getElementById("code");

form.addEventListener("submit", async e => {
  e.preventDefault();

  if (editingUserId) {
    messageContainer.innerHTML = `<p class="error-message">Clear form to add new user</p>`;
    return;
  }

  const name = nameInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmPasswordInput.value;
  const userGroup = userGroupInput.value;
  const userId = userIdInput.value;
  const code = codeInput.value;

  if (!name || !username || !password || !confirm || !userGroup || !code) {
    alert("All fields required");
    return;
  }
  if (password !== confirm) {
    alert("Passwords do not match");
    return;
  }
  try {
    await setDoc(doc(db, "users", userId), {
      branchId: name,
      code,
      username,
      password,
      role: userGroup,
      usernum: userId,
      deviceId: "",
      createdAt: new Date()
    });

    alert("Saved");
    form.reset();
    getNextUserId();
  } catch (err) {
    alert(`${err.message}`);
  }
});


// Row Click to Populate for Update
tableReport.addEventListener("dblclick", async e => {
  const row = e.target.closest(".user-row");
  if (!row) return;
  editingUserId = row.dataset.id;
  const docSnap = await getDoc(doc(db, "users", editingUserId));
  if (!docSnap.exists()) return;
  const d = docSnap.data();
  userid.value = d.usernum;
  nameInput.value = d.branchId;
  codeInput.value = d.code;
  usernameInput.value = d.username;
  passwordInput.value = d.password;
  confirmPasswordInput.value = d.password;
  userGroupInput.value = d.role;
});

// Update User
document.querySelector(".update").addEventListener("click", async e => {
  e.preventDefault();
  if (!editingUserId) {
    alert("Select user first");
    return;
  }
  try {
    await updateDoc(doc(db, "users", editingUserId), {
      branchId: nameInput.value.trim(),
      code: codeInput.value.trim(),
      username: usernameInput.value.trim(),
      password: passwordInput.value,
      role: userGroupInput.value
    });
    alert("Updated");
    form.reset();
    editingUserId = null;
    getNextUserId();
  } catch (err) {
    alert(`${err.message}`);
  }
});

document.querySelector(".clear").addEventListener("click", () => {
  editingUserId = null;
  form.reset();
  getNextUserId();
});

// Reset Device
tableReport.addEventListener("click", async (e) => {
  if (e.target.classList.contains("reset-device")) {
    const userDocId = e.target.getAttribute("data-id");
    if (!userDocId) return;
    const confirmReset = confirm("Reset device for this user?");
    if (!confirmReset) return;
    try {
      await updateDoc(doc(db, "users", userDocId), {
        deviceId: null
      });
      alert("Device reset successfully");
    } catch (error) {
      console.error("Reset failed:", error);
      alert("Reset failed");
    }
  }
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