import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, getDoc, doc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, setDoc, onSnapshot, serverTimestamp, Timestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const appSetting = {
    apiKey: "AIzaSyD3U80a7q7B4HUh4aPGouUwQaIKtYjHMPs",
    authDomain: "bank-transfer-63bb2.firebaseapp.com",
    //databaseURL: "https://bank-transfer-63bb2-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "bank-transfer-63bb2",
    storageBucket: "bank-transfer-63bb2.firebasestorage.app",
    messagingSenderId: "762671347019",
    appId: "1:762671347019:web:6829339704d3699a3be4ce"

};

const app = initializeApp(appSetting);
const db = getFirestore(app);

export { db, getDoc, doc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, orderBy, setDoc, serverTimestamp, Timestamp, runTransaction }; 
