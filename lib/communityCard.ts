// Preserve nested controls, image lightboxes, profile links and text selection.
export function shouldOpenCommunityCard(target: EventTarget | null, selectedText = ""): boolean {
  if (selectedText || !(target instanceof Element)) return false;
  return !target.closest('a,button,input,textarea,select,label,[role="button"],[role="dialog"],[data-card-interactive]');
}
