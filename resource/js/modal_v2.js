const modal = document.querySelector(".modal");

function toggleModal() {
    modal.classList.toggle("show_modal");
}

function windowOnClick(event) {
    if (event.target === modal) {
        toggleModal();
    }
}

window.addEventListener("click", windowOnClick);
