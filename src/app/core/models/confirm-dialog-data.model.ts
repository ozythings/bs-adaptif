export interface ConfirmDialogMessageItem {
  icon?: string;
  iconClass?: string;
  text: string;
}

export interface ConfirmDialogData {
  title: string;
  message?: string;
  messageItems?: ConfirmDialogMessageItem[];
  confirmLabel?: string;
  cancelLabel?: string;
}
