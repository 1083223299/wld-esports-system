import { field } from './shared.js';

export const fileForms = {
  categories: [
    {
      title: '创建分类',
      path: '/categories',
      fields: [
        field('name', '分类名称'),
        field('parentId', '父分类', 'select', false, { source: 'categories' }),
        field('inherit', '继承父分类授权', 'checkbox', false),
        field('acl', '显式授权', 'acl', false),
      ],
      defaults: {
        inherit: true,
        acl: { all: ['view'] },
      },
    },
  ],
};
