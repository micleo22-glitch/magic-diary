type ToastType = 'success' | 'error' | 'info'
type ToastListener = (msg: string, type: ToastType) => void

let _listener: ToastListener | null = null

export function toast(msg: string, type: ToastType = 'success') {
  _listener?.(msg, type)
}

export function setToastListener(fn: ToastListener) {
  _listener = fn
}
