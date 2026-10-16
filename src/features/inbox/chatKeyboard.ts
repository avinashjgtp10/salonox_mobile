// Measure overlap with the current viewport, which may already have been
// resized by Android. A full keyboard-height inset would count that twice.
export function chatKeyboardInset(viewportBottom: number, keyboardTop: number | null, safeBottom: number) {
  return keyboardTop === null ? safeBottom : Math.max(0, viewportBottom - keyboardTop);
}
