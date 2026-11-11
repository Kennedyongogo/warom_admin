import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "./swal.css";

const base = {
  customClass: {
    container: "warom-swal",
    popup: "warom-swal__popup",
    title: "warom-swal__title",
    htmlContainer: "warom-swal__text",
    confirmButton: "warom-swal__confirm",
    cancelButton: "warom-swal__cancel",
    icon: "warom-swal__icon",
  },
  buttonsStyling: false,
  reverseButtons: true,
};

export function showSuccess(title, text = "", options = {}) {
  return Swal.fire({
    ...base,
    icon: "success",
    title,
    text,
    confirmButtonText: "Continue",
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: true,
    ...options,
  });
}

export function showError(title, text = "", options = {}) {
  return Swal.fire({
    ...base,
    icon: "error",
    title,
    text,
    confirmButtonText: "Try again",
    ...options,
  });
}

export function showWarning(title, text = "") {
  return Swal.fire({
    ...base,
    icon: "warning",
    title,
    text,
    confirmButtonText: "OK",
  });
}

export function showInfo(title, text = "") {
  return Swal.fire({
    ...base,
    icon: "info",
    title,
    text,
    confirmButtonText: "Got it",
  });
}

/** Success toast then a countdown that signs the admin out. */
export async function showSuccessThenLogout({
  title,
  text = "",
  seconds = 5,
  onLogout,
}) {
  await showSuccess(title, text);

  let remaining = seconds;
  const result = await Swal.fire({
    ...base,
    icon: "info",
    title: "Signing you out",
    html: `<p class="warom-swal__countdown">For your security, you'll be signed out in <strong id="warom-logout-count">${remaining}</strong>s.</p>
           <p class="warom-swal__hint">Sign in again with your updated details.</p>`,
    confirmButtonText: "Sign out now",
    showCancelButton: true,
    cancelButtonText: "Stay a moment",
    allowOutsideClick: false,
    timer: seconds * 1000,
    timerProgressBar: true,
    didOpen: () => {
      const el = document.getElementById("warom-logout-count");
      const timer = setInterval(() => {
        remaining -= 1;
        if (el && remaining >= 0) el.textContent = String(remaining);
        if (remaining <= 0) clearInterval(timer);
      }, 1000);
      Swal.getPopup()?.setAttribute("data-logout-timer", String(timer));
    },
    willClose: () => {
      const popup = Swal.getPopup();
      const id = popup?.getAttribute("data-logout-timer");
      if (id) clearInterval(Number(id));
    },
  });

  if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
    onLogout?.();
    return true;
  }
  return false;
}
