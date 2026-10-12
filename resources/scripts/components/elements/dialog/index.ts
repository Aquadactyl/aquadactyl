import DialogComponent from "./Dialog";
import DialogFooter from "./DialogFooter";
import DialogIcon from "./DialogIcon";
import ConfirmationDialog from "./ConfirmationDialog";

const Dialog = Object.assign(DialogComponent, {
  Confirm: ConfirmationDialog,
  Footer: DialogFooter,
  Icon: DialogIcon,
});

export { Dialog };
export type {
  Callback,
  DialogContextType,
  DialogIconProps,
  DialogProps,
  DialogWrapperContextType,
  IconPosition,
  RenderDialogProps,
  WrapperProps,
} from "@/globals";
export * from "./context";
