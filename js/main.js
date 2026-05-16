// Tab Switching
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(div => div.classList.add('hidden'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tab).classList.remove('hidden');
  document.querySelector(`.tab-button[onclick*="${tab}"]`).classList.add('active');
}




 