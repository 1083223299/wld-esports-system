import { ElMessageBox } from 'element-plus';

export function showErrorDialog(message, title = '操作失败') {
  return ElMessageBox.alert(String(message || '操作失败'), title, {
    confirmButtonText: '确认',
    closeOnClickModal: false,
    closeOnPressEscape: false,
    showClose: false,
    type: 'error',
  });
}
