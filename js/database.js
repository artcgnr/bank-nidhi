import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, set, get, remove} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const appSetting = {
    apiKey: "AIzaSyD3U80a7q7B4HUh4aPGouUwQaIKtYjHMPs",
    authDomain: "bank-transfer-63bb2.firebaseapp.com",
    databaseURL: "https://bank-transfer-63bb2-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "bank-transfer-63bb2",
    storageBucket: "bank-transfer-63bb2.firebasestorage.app",
    messagingSenderId: "762671347019",
    appId: "1:762671347019:web:6829339704d3699a3be4ce"
};

const app = initializeApp(appSetting);
const db = getDatabase(app);

export { db, ref, push, onValue, update, set, get, remove }; 
