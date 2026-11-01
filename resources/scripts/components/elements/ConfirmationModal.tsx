import React from "react";
import { Dialog } from "@/components/elements/dialog";

type Props = {
  visible: boolean;
  onModalDismissed: () => void;
  title: string;
  buttonText: string;
  onConfirmed: () => void;
  showSpinnerOverlay?: boolean;
  children?: React.ReactNode;
};

const ConfirmationModal: React.FC<Props> = ({
  visible,
  onModalDismissed,
  title,
  children,
  buttonText,
  onConfirmed,
}) => {
  return (
    <Dialog.Confirm
      open={visible}
      onClose={onModalDismissed}
      title={title}
      confirm={buttonText}
      onConfirmed={onConfirmed}
    >
      {children}
    </Dialog.Confirm>
  );
};

ConfirmationModal.displayName = "ConfirmationModal";

export default ConfirmationModal;
