import { db, ref, get } from './database.js';

document.getElementById('loginForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMessage = document.getElementById('error-message');
  errorMessage.innerHTML = "";

  const now = new Date();
/*  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const startHour = 18, startMinute = 29;
  const endHour = 3, endMinute = 59;*/

 /* if (day === 0 || 
     (hours < startHour || (hours === startHour && minutes < startMinute)) || 
     (hours > endHour || (hours === endHour && minutes > endMinute))) {
    errorMessage.innerHTML = "Login is not allowed.";
    return;
  }*/

  try {
    const snapshot = await get(ref(db, "users"));
    const users = snapshot.val();
    let isValidUser = false;

    for (let key in users) {
      const user = users[key];
      if (user.username === username && user.password === password) {
        localStorage.setItem('brName', user.branch);
        localStorage.setItem('userId', user.id);
        isValidUser = true;  
        if (user.id === '1') { 
          window.location.href = 'index.html';
        } else if (user.id === '2' || user.id === '3') {                        
          window.location.href = 'admin.html';                    
        } else {                       
          errorMessage.innerHTML = "Invalid user. Please contact support.";                    
        }                 
      }       
    }
    if (!isValidUser) {
      errorMessage.innerHTML = "Invalid username or password.";
    }
  } catch (error) {
    console.error("Firebase error:", error);
    errorMessage.innerHTML = "Error occurred. Try again later.";
  }
});

