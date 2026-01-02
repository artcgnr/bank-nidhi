import { db, collection, getDocs, query, where, updateDoc, doc } from './database.js';

const statusBox = document.getElementById("error-message");

// Clear any existing logged user session on load
localStorage.removeItem('loggedUser');

const getDeviceId = () => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('deviceId', id);
  }
  return id;
};

const currentDeviceId = getDeviceId();

document.getElementById("signInBtn").onclick = async () => {

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    statusBox.textContent = "Enter username and password";
    return;
  }

  try {

    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      statusBox.textContent = "User not found";
      return;
    }

    const docSnap = snapshot.docs[0];
    const user = docSnap.data();

    if (user.password !== password) {
      statusBox.textContent = "Incorrect password";
      return;
    }

    // BRANCH → device binding required
    if (user.role === "branch") {

      if (!user.deviceId) {
        await updateDoc(doc(db, 'users', docSnap.id), {
          deviceId: currentDeviceId
        });
      } else if (user.deviceId !== currentDeviceId) {
        statusBox.textContent = "Account already linked to another device";
        return;
      }

      localStorage.setItem(
        "loggedUser",
        JSON.stringify({ id: docSnap.id, ...user })
      );

      window.location.href = "./branch";
      return;
    }

    // ADMIN → device check skipped
    if (user.role === "admin") {

      localStorage.setItem(
        "loggedUser",
        JSON.stringify({ id: docSnap.id, ...user })
      );

      window.location.href = "./admin";
      return;
    }

    statusBox.textContent = "Invalid user role";

  } catch (err) {
    console.error(err);
    statusBox.textContent = "Login failed. Try again.";
  }
};
