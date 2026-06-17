const toggle = document.getElementById("toggle");
const count = document.getElementById("count");

chrome.storage.sync.get(
{
enabled: true,
skipped: 0
},
(s) => {
toggle.checked = s.enabled !== false;
count.textContent = s.skipped || 0;
}
);

toggle.addEventListener("change", () => {
chrome.storage.sync.set({
enabled: toggle.checked
});
});

document.getElementById("reset").addEventListener("click", () => {

chrome.storage.sync.set({
skipped: 0
});

count.textContent = "0";

});

chrome.storage.onChanged.addListener((changes) => {

if (changes.skipped) {
count.textContent =
changes.skipped.newValue || 0;
}

});
