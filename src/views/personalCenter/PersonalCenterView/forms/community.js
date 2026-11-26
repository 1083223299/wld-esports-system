import { field } from './shared.js';

export const communityForms = {
  content: [
    {
      title: '发布帖子',
      path: '/content/post',
      fields: [
        field('title', '标题'),
        field('text', '正文', 'textarea'),
        field('mediaIds', '内部图片', 'media', false),
        field('externalImages', '外链图片', 'text', false, {
          help: '仅HTTPS图片，多张用逗号分隔；外链失效不影响正文。',
        }),
      ],
    },
  ],
};
