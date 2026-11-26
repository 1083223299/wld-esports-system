function field(key, label, type = 'text', required = true, extra = {}) {
  return { key, label, type, required, ...extra };
}

export const employeeField = field('employeeId', '员工', 'select', true, {
  source: 'employees',
});

export const recordVersionField = field('expectedVersion', '当前记录版本', 'text', true, {
  help: '打开记录后自动填写，记录变化时请刷新。',
});

export const reasonField = field('reason', '原因 / 说明', 'textarea');

export const shiftField = field('shiftId', '班次', 'select', true, {
  options: [
    { value: 'EARLY', label: '早班' },
    { value: 'MIDDLE', label: '中班' },
    { value: 'LATE', label: '晚班' },
  ],
});

export { field };
