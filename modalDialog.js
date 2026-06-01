(function () {
  const modal = document.querySelector("#alertModal");
  const titleEl = document.querySelector("#alertModalTitle");
  const messageEl = document.querySelector("#alertModalMessage");
  const okButton = document.querySelector("#alertModalOk");

  function hide() {
    if (!modal) return;
    modal.hidden = true;
  }

  function showAlert({ title = "Notice", message = "", okText = "OK" } = {}) {
    if (!modal) return;
    titleEl.textContent = title;
    messageEl.textContent = message;
    okButton.textContent = okText;
    modal.hidden = false;
    okButton.focus();
  }

  okButton?.addEventListener("click", hide);
  modal?.addEventListener("pointerdown", (event) => {
    if (event.target === modal) hide();
  });

  window.ModalDialog = {
    alert: showAlert,
    hideAlert: hide,
  };
})();
