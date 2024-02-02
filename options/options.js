function initPreferences() {
  /*
    @modifies localStorage
    @effects if a checkbox's textContent is not present in localStorage, initializes an entry for that textContent paired with "F" (false)
    */
  const checkboxes = document.getElementsByTagName("li");
  for (let i = 0; i < checkboxes.length; i++) {
    if (localStorage.getItem(checkboxes[i].textContent) === null) {
      localStorage.setItem(checkboxes[i].textContent, "F");
    }
  }
}

function getPreferences() {
  /*
    @modifies DOM
    @effects Sets each key set to "T" to checked in the DOM; unchecked otherwise
    */
  const checkboxes = document.getElementsByTagName("li");
  for (let i = 0; i < checkboxes.length; i++) {
    if (localStorage.getItem(checkboxes[i].textContent) === "T") {
      if (!checkboxes[i].childNodes[1].checked) {
        console.log(checkboxes[i].textContent);
        checkboxes[i].childNodes[1].click();
      }
    } else {
      if (checkboxes[i].checked) {
        checkboxes[i].click();
      }
    }
  }
}

function savePreference(e) {
  /*
    @param checkbox - one of the checkboxes on the options page
    @modifies localStorage
    @effects if checkbox.checked == true, sets key for checkbox.textContent to true in localStorage; false otherwise
    */
  const checkbox = e.target;
  if (checkbox.checked) {
    localStorage.setItem(checkbox.parentNode.textContent, "T");
  } else {
    localStorage.setItem(checkbox.parentNode.textContent, "F");
  }
}

function restoreDefaultOptions() {
  const checkboxes = document.getElementsByTagName("li");
  for (let i = 0; i < checkboxes.length; i++) {
    localStorage.setItem(checkboxes[i].textContent, "F");
  }
  getPreferences();
}

window.onload = () => {
  initPreferences();
  getPreferences();
  // Add event listener for every checkbox
  const checkboxes = document.getElementsByTagName("li");
  for (let i = 0; i < checkboxes.length; i++) {
    console.log(checkboxes[i].childNodes);
    checkboxes[i].childNodes[1].addEventListener("input", savePreference);
  }
};
