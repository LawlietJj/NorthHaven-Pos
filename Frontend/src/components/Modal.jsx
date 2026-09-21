import { useModalKeyboard } from "../utils/useModalKeyboard";

function Modal({ title, children, onClose }) {
  const modalRef = useModalKeyboard(onClose);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-surface rounded-xl p-5 shadow-lg w-full max-w-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-medium text-primary mb-4">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default Modal;