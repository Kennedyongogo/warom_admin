import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import "./Modal.css";

const CLOSE_MS = 180;

/**
 * Native <dialog> shell: focus trapping, Escape and backdrop clicks come from the browser,
 * this adds the exit animation. `children` receives `close` so content can dismiss itself.
 */
export default function Modal({ labelledBy, onClose, busy = false, initialFocusRef, size = "md", fit = false, children }) {
  const dialogRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    initialFocusRef?.current?.focus();
  }, [initialFocusRef]);

  const close = useCallback(() => {
    if (busy || closing) return;
    setClosing(true);
    setTimeout(() => {
      dialogRef.current?.close();
      onClose();
    }, CLOSE_MS);
  }, [busy, closing, onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}${fit ? " modal--fit" : ""}${closing ? " is-closing" : ""}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => event.target === dialogRef.current && close()}
    >
      <div className="modal__card">
        <button type="button" className="modal__close" onClick={close} aria-label="Close" disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {typeof children === "function" ? children(close) : children}
      </div>
    </dialog>
  );
}

export function Field({ id, label, error, hint, icon, trailing, labelAction, children }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <span className="field__label-row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {labelAction}
      </span>
      <span className="field__control">
        {icon && <span className="field__icon">{icon}</span>}
        {cloneElement(children, {
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
        })}
        {trailing}
      </span>
      {error ? (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="field__hint" id={`${id}-hint`}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
