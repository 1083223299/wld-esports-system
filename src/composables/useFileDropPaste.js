import { ref } from 'vue';

export function useFileDropPaste(onFiles) {
  const isDragging = ref(false);

  function onDragOver(event) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function onDragEnter() {
    isDragging.value = true;
  }

  function onDragLeave(event) {
    const target = event.relatedTarget;
    if (!target || !event.currentTarget.contains(target)) {
      isDragging.value = false;
    }
  }

  function onDrop(event) {
    isDragging.value = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) onFiles(files);
  }

  function onPaste(event) {
    const itemFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean);
    const files = itemFiles.length ? itemFiles : Array.from(event.clipboardData?.files || []);
    if (!files.length) return;
    event.preventDefault();
    onFiles(files);
  }

  return {
    isDragging,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onPaste,
  };
}
