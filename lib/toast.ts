import { toast, type ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
    autoClose: 4000,
};

export const notify = {
    error: (message: string, options?: ToastOptions) => toast.error(message, { ...defaultOptions, ...options }),
    success: (message: string, options?: ToastOptions) => toast.success(message, { ...defaultOptions, ...options }),
    warning: (message: string, options?: ToastOptions) => toast.warning(message, { ...defaultOptions, ...options }),
    info: (message: string, options?: ToastOptions) => toast.info(message, { ...defaultOptions, ...options }),
};
