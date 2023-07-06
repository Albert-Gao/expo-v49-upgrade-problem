import * as Burnt from "burnt";

const layout = {
  iconSize: {
    height: 72,
    width: 72
  }
};

interface ToastParams {
  title: string;
  message?: string;
  duration?: number;
}

export const Toast = {
  Success({ title, message, duration = 2.2 }: ToastParams) {
    Burnt.alert({
      title,
      message,

      preset: "done", // or "error", "heart", "custom"

      duration, // duration in seconds

      // optionally customize layout
      layout
    });
  },

  Error({ title, message, duration = 2.3 }: ToastParams) {
    Burnt.toast({
      title,
      message,

      preset: "error", // or "error", "heart", "custom"

      duration // duration in seconds

      // optionally customize layout
      // layout
    });
  }
};
