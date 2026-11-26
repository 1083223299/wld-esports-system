import { field, employeeField, reasonField, shiftField } from './shared.js';

export const schedulingForms = {
  shifts: [
    {
      title: '调班影响预检',
      path: '/shift-changes/preview',
      fields: [
        employeeField,
        { ...shiftField, key: 'newShiftId' },
        reasonField,
        field('override', '最高管理特批', 'checkbox', false),
      ],
      defaults: { override: false },
    },
  ],
  seats: [
    {
      title: '维护工位',
      path: '/seats',
      fields: [
        field('name', '工位名称'),
        field('x', '横坐标（0～100）', 'number'),
        field('y', '纵坐标（0～100）', 'number'),
        field('sort', '排序', 'number'),
        field('enabled', '启用', 'checkbox', false),
      ],
      defaults: { enabled: true, sort: 0 },
    },
  ],
  seating: [
    {
      title: '新建座次草稿',
      path: '/seating/drafts',
      fields: [
        field('date', '业务日期', 'date'),
        shiftField,
        field('assignments', '人员与工位安排', 'assignments', false),
      ],
      defaults: { assignments: [] },
    },
  ],
};
