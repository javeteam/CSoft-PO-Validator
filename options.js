function saveOptions(e) {
  e.preventDefault();
  browser.storage.sync.set({
    serverUrl: document.querySelector("#serverUrl").value,
    authToken: document.querySelector("#authToken").value
  });
  const btn = document.querySelector("button");
  btn.innerText = "Saved...";
  btn.disabled = true;
  btn.style.color = "red";

  setTimeout(restoreBtn, 1200);
}


function restoreBtn(){
  const btn = document.querySelector("button");
  btn.innerText = "Save";
  btn.style.color = "";
}

function restoreOptions(){

  function setCurrentChoice(result) {
    document.querySelector("#serverUrl").value = result.serverUrl || null;
    document.querySelector("#authToken").value = result.authToken || null;
  }

  function onError(error){
    console.log(`Error: ${error}`);
  }

  let getting = browser.storage.sync.get(["serverUrl","authToken"]);
  getting.then(setCurrentChoice, onError);
}


function submitBtnStatusChange(){
  if(!document.querySelector("form").checkValidity()) document.querySelector("button").disabled = true;
  else document.querySelector("button").disabled = false;
}


document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelectorAll("form input").forEach(el => el.addEventListener("input", submitBtnStatusChange));

