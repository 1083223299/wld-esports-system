<template>
  <div class="container">
    <div ref="responsiveModule">
      <SearchForm
        ref="searchForm"
        :fields="searchItems"
        :initial-values="filterForm"
        :gutter="20"
        @search="handleSearch"
        @reset="handleReset"
      />
    </div>

    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button
          v-permission="'community:music:add'"
          type="primary"
          icon="el-icon-plus"
          class="add-btn"
          @click="handleAdd"
        >
          新增音乐
        </el-button>
      </div>

      <div class="table-wrapper">
        <el-table
          :data="tableData"
          stripe
          row-key="musicId"
          v-loading="loading"
          :border="false"
          height="100%"
          :header-row-style="{ backgroundColor: '#F6F6FB' }"
          :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }"
        >
          <el-table-column prop="musicName" label="音乐名称" min-width="180" show-overflow-tooltip />
          <el-table-column label="封面" width="100">
            <template slot-scope="scope">
              <el-image
                v-if="scope.row.coverUrl"
                :src="scope.row.coverUrl"
                style="width: 48px; height: 48px"
                fit="cover"
                :preview-src-list="[scope.row.coverUrl]"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="singer" label="歌手" width="140" />
          <el-table-column prop="durationText" label="时长" width="120" />
          <el-table-column prop="sortOrder" label="排序" width="100" />
          <el-table-column label="状态" width="120">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'warning'">
                {{ scope.row.status === '0' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180" />
          <el-table-column
            label="操作"
            fixed="right"
            width="160"
            v-if="checkPermission('community:music:edit')"
          >
            <template slot-scope="scope">
              <div class="action-buttons">
                <el-button
                  v-permission="'community:music:edit'"
                  type="text"
                  @click="handleEdit(scope.row)"
                  style="color: #9047f8"
                >编辑</el-button>
                <el-button
                  v-permission="'community:music:edit'"
                  type="text"
                  @click="toggleStatus(scope.row)"
                  :style="{ color: scope.row.status === '0' ? '#f56c6c' : '#6A35FF' }"
                >
                  {{ scope.row.status === '0' ? '停用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-fixed">
        <PaginationSimple
          :current-page="pagination.pageNum"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-drawer
      :visible.sync="dialogVisible"
      direction="rtl"
      size="620px"
      custom-class="music-drawer"
      :close-on-click-modal="false"
      :before-close="handleDialogClose"
    >
      <div slot="title" class="drawer-title">
        <div class="drawer-title__main">
          <i class="el-icon-headset drawer-title__icon" />
          <span class="drawer-title__name">{{ dialogTitle }}</span>
        </div>
        <span class="drawer-title__desc">维护社区音乐的名称、封面、音频与推荐排序</span>
      </div>
      <div class="drawer-content" v-loading="detailLoading">
        <el-form ref="musicForm" :model="form" :rules="rules" label-width="110px" class="music-form">
          <el-form-item label="音乐名称" prop="musicName">
            <el-input v-model="form.musicName" placeholder="请输入音乐名称" clearable />
          </el-form-item>

          <el-form-item label="歌手" prop="singer">
            <el-input v-model="form.singer" placeholder="请输入歌手（选填）" clearable />
          </el-form-item>

          <el-form-item label="封面图" prop="coverUrl">
            <div class="upload-box">
              <el-upload
                v-if="!form.coverUrl"
                action="#"
                :show-file-list="false"
                accept=".jpg,.jpeg,.png"
                :disabled="uploading"
                :before-upload="beforeCoverUpload"
                :http-request="handleCoverUpload"
              >
                <div class="upload-placeholder" v-loading="uploading">
                  <span class="upload-placeholder__icon"><i class="el-icon-plus" /></span>
                  <span class="upload-placeholder__text">上传封面</span>
                  <span class="upload-placeholder__tip">JPG / PNG</span>
                </div>
              </el-upload>
              <div v-else class="cover-preview">
                <div class="cover-preview__media">
                  <img :src="form.coverUrl" alt="cover" />
                  <div class="cover-preview__mask">
                    <el-button size="mini" type="text" class="delete-btn" @click="removeCover">删除</el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="音频文件" prop="audioUrl">
            <div class="upload-box audio-box">
              <el-upload
                v-if="!form.audioUrl"
                action="#"
                :show-file-list="false"
                accept=".mp3"
                :disabled="uploading"
                :before-upload="beforeAudioUpload"
                :http-request="handleAudioUpload"
              >
                <div class="upload-placeholder audio-placeholder" v-loading="uploading">
                  <span class="upload-placeholder__icon"><i class="el-icon-upload2" /></span>
                  <span class="upload-placeholder__text">上传音频</span>
                  <span class="upload-placeholder__tip">MP3</span>
                </div>
              </el-upload>
              <div v-else class="audio-preview">
                <div class="audio-preview__head">
                  <i class="el-icon-video-play" />
                  <span>音频预览</span>
                  <span class="audio-preview__duration">{{ formatDuration(form.durationMs) }}</span>
                </div>
                <audio :src="form.audioUrl" controls style="width: 100%" />
                <el-button size="mini" type="text" class="delete-btn" @click="removeAudio">删除</el-button>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="推荐排序" prop="sortOrder">
            <el-input-number v-model="form.sortOrder" :min="1" :step="1" controls-position="right" />
          </el-form-item>

          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio label="0">启用</el-radio>
              <el-radio label="1">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <div class="drawer-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">保存</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import SearchForm from '@/components/SearchComponent/index.vue';
import PaginationSimple from '@/components/PaginationSimple/index.vue';
import {
  getCommunityMusicPage,
  getCommunityMusicDetail,
  addCommunityMusic,
  updateCommunityMusic,
  changeCommunityMusicStatus
} from '@/api/community';
import { fileUpload } from '@/api/user';
import checkPermission from "@/utils/checkPermission";

export default {
  name: 'CommunityMusicManagement',
  components: { SearchForm, PaginationSimple },
  data() {
    return {
      searchItems: [
        {
          type: 'input',
          prop: 'musicName',
          label: '音乐名称',
          placeholder: '请输入音乐名称',
          clearable: true,
        },
        {
          type: 'select',
          prop: 'status',
          label: '状态',
          placeholder: '请选择状态',
          options: [
            { label: '全部', value: '' },
            { label: '启用', value: '0' },
            { label: '停用', value: '1' },
          ],
          clearable: true,
        },
      ],
      loading: false,
      uploading: false,
      submitLoading: false,
      detailLoading: false,
      dialogVisible: false,
      dialogTitle: '新增音乐',
      editId: null,
      filterForm: {
        musicName: '',
        status: ''
      },
      pagination: {
        pageNum: 1,
        pageSize: 10,
        total: 0
      },
      tableData: [],
      form: {
        musicName: '',
        singer: '',
        coverUrl: '',
        coverOssId: '',
        audioUrl: '',
        audioOssId: '',
        durationMs: 0,
        sortOrder: 1,
        status: '0'
      },
      rules: {
        musicName: [{ required: true, message: '请输入音乐名称', trigger: 'blur' },
          { validator: (rule, value, callback) => {
            if (!value || !String(value).trim()) {
              callback(new Error('音乐名称不能为空'));
              return;
            }
            callback();
          }, trigger: 'blur' }],
        coverUrl: [{ required: true, message: '请上传封面图', trigger: 'change' }],
        audioUrl: [{ required: true, message: '请上传音频文件', trigger: 'change' }],
        sortOrder: [{ required: true, message: '请输入推荐排序', trigger: 'blur' },
          { type: 'number', min: 1, message: '推荐排序必须为正整数', trigger: 'blur' }]
      }
    };
  },
  created() {
    this.fetchTableData();
  },
  methods: {
    checkPermission,
    extractPageData(res) {
      if (!res) return { rows: [], total: 0 };
      let data = res;
      if (data.data) data = data.data;
      if (data.data) data = data.data;
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const total = data.total != null ? Number(data.total) : 0;
      return { rows, total };
    },
    buildPageParams() {
      const params = {
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      const name = (this.filterForm.musicName || '').trim();
      if (name) params.musicName = name;
      if (this.filterForm.status !== undefined && this.filterForm.status !== '') {
        params.status = this.filterForm.status;
      }
      return params;
    },
    async fetchTableData() {
      this.loading = true;
      try {
        const res = await getCommunityMusicPage(this.buildPageParams());
        const { rows, total } = this.extractPageData(res);
        this.tableData = rows;
        this.pagination.total = total;
      } catch (error) {
        console.error('获取音乐列表失败:', error);
        this.tableData = [];
        this.pagination.total = 0;
      } finally {
        this.loading = false;
      }
    },
    handleSearch(e) {
      if (e) {
        this.filterForm = { ...e };
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleReset() {
      this.filterForm = { musicName: '', status: '' };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },
    handleCurrentChange(page) {
      this.pagination.pageNum = page;
      this.fetchTableData();
    },
    resetForm() {
      this.form = {
        musicName: '',
        singer: '',
        coverUrl: '',
        coverOssId: '',
        audioUrl: '',
        audioOssId: '',
        durationMs: 0,
        sortOrder: 1,
        status: '0'
      };
    },
    handleAdd() {
      this.dialogTitle = '新增音乐';
      this.editId = null;
      this.resetForm();
      this.dialogVisible = true;
      this.$nextTick(() => {
        if (this.$refs.musicForm) this.$refs.musicForm.clearValidate();
      });
    },
    async handleEdit(row) {
      this.dialogTitle = '编辑音乐';
      this.editId = row.musicId;
      this.resetForm();
      this.dialogVisible = true;
      this.detailLoading = true;
      try {
        const res = await getCommunityMusicDetail({ musicId: row.musicId });
        const data = (res && res.data) || res || {};
        this.form = {
          musicName: data.musicName || '',
          singer: data.singer === '-' ? '' : (data.singer || ''),
          coverUrl: data.coverUrl || '',
          coverOssId: data.coverOssId || '',
          audioUrl: data.audioUrl || '',
          audioOssId: data.audioOssId || '',
          durationMs: data.durationMs || 0,
          sortOrder: data.sortOrder != null ? Number(data.sortOrder) : 1,
          status: data.status != null ? String(data.status) : '0'
        };
      } catch (error) {
        console.error('获取音乐详情失败:', error);
        this.$message.error('获取音乐详情失败');
      } finally {
        this.detailLoading = false;
        this.$nextTick(() => {
          if (this.$refs.musicForm) this.$refs.musicForm.clearValidate();
        });
      }
    },
    handleDialogClose() {
      this.dialogVisible = false;
      if (this.$refs.musicForm) this.$refs.musicForm.clearValidate();
    },
    beforeCoverUpload(file) {
      const valid = /\.(jpg|jpeg|png)$/i.test(file.name);
      if (!valid) {
        this.$message.error('封面仅支持 jpg / png 格式');
        return false;
      }
      return true;
    },
    async handleCoverUpload({ file, onSuccess }) {
      try {
        this.uploading = true;
        const formData = new FormData();
        formData.append('file', file);
        const response = await fileUpload(formData, { silentError: true });
        if (!(response.code === 200 || response.success)) {
          throw new Error(response.message || '封面上传失败');
        }
        this.form.coverOssId = response.data.ossId;
        this.form.coverUrl = URL.createObjectURL(file);
        if (this.$refs.musicForm) this.$refs.musicForm.validateField('coverUrl');
        this.$message.success('封面上传成功');
        if (onSuccess) onSuccess('success');
      } catch (error) {
        this.$message.error(this.extractUploadError(error, '封面上传失败'));
      } finally {
        this.uploading = false;
      }
    },
    beforeAudioUpload(file) {
      const valid = /\.mp3$/i.test(file.name);
      if (!valid) {
        this.$message.error('音频仅支持 mp3 格式');
        return false;
      }
      return true;
    },
    async handleAudioUpload({ file, onSuccess }) {
      try {
        this.uploading = true;
        const formData = new FormData();
        formData.append('file', file);
        const response = await fileUpload(formData, { silentError: true });
        if (!(response.code === 200 || response.success)) {
          throw new Error(response.message || '音频上传失败');
        }
        this.form.audioOssId = response.data.ossId;
        const url = URL.createObjectURL(file);
        this.form.audioUrl = url;
        this.form.durationMs = await this.readAudioDuration(url);
        if (this.$refs.musicForm) this.$refs.musicForm.validateField('audioUrl');
        this.$message.success('音频上传成功');
        if (onSuccess) onSuccess('success');
      } catch (error) {
        this.$message.error(this.extractUploadError(error, '音频上传失败'));
      } finally {
        this.uploading = false;
      }
    },
    extractUploadError(error, fallback) {
      const data = error && error.response && error.response.data;
      const serverMsg = data && (data.message || data.msg || data.errorMessage || data.error);
      return serverMsg || (error && error.message) || fallback;
    },
    readAudioDuration(url) {
      return new Promise(resolve => {
        const audio = new Audio();
        audio.src = url;
        audio.onloadedmetadata = () => resolve(Math.round(audio.duration * 1000) || 0);
        audio.onerror = () => resolve(0);
      });
    },
    formatDuration(ms) {
      if (!ms || Number(ms) <= 0) return '00:00';
      const totalSeconds = Math.floor(Number(ms) / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    },
    removeCover() {
      this.form.coverUrl = '';
      this.form.coverOssId = '';
    },
    removeAudio() {
      this.form.audioUrl = '';
      this.form.audioOssId = '';
      this.form.durationMs = 0;
    },
    handleSubmit() {
      this.$refs.musicForm.validate(async valid => {
        if (!valid) return;
        this.submitLoading = true;
        try {
          const payload = {
            musicName: this.form.musicName.trim(),
            sortOrder: Number(this.form.sortOrder),
            status: String(this.form.status),
            durationMs: Number(this.form.durationMs || 0)
          };
          const singer = (this.form.singer || '').trim();
          if (singer) payload.singer = singer;
          if (this.form.coverOssId) payload.coverOssId = this.form.coverOssId;
          if (this.form.audioOssId) payload.audioOssId = this.form.audioOssId;

          if (this.editId) {
            payload.musicId = this.editId;
            await updateCommunityMusic(payload);
            this.$message.success('音乐修改成功');
          } else {
            await addCommunityMusic(payload);
            this.$message.success('音乐新增成功');
          }
          this.dialogVisible = false;
          this.fetchTableData();
        } catch (error) {
          console.error('保存失败:', error);
        } finally {
          this.submitLoading = false;
        }
      });
    },
    async toggleStatus(row) {
      const nextStatus = row.status === '0' ? '1' : '0';
      try {
        await changeCommunityMusicStatus({ musicId: row.musicId, status: nextStatus });
        row.status = nextStatus;
        this.$message.success(nextStatus === '0' ? '已启用' : '已停用');
      } catch (error) {
        console.error('状态切换失败:', error);
      }
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  height: 100%;
  padding: 20px;
  background: #f5f7fb;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: none;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

::v-deep .list-card .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-bar-fixed {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16px;
}

.add-btn {
  background: #6a35ff;
  border-color: #6a35ff;
  border-radius: 6px;
  font-weight: 500;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.pagination-fixed {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  flex-shrink: 0;
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  box-sizing: border-box;
}

.music-form {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  background: #fff;
  border-radius: 14px;
  padding: 24px 22px 6px;
  box-shadow: 0 4px 20px rgba(106, 53, 255, 0.06);
  box-sizing: border-box;

  ::v-deep .el-form-item {
    margin-bottom: 22px;
  }

  ::v-deep .el-form-item__label {
    color: #1d2129;
    font-weight: 600;
  }

  ::v-deep .el-input__inner {
    border-radius: 10px;
    height: 40px;
    line-height: 40px;
  }

  ::v-deep .el-input__inner:focus,
  ::v-deep .el-input__inner:hover {
    border-color: #6a35ff;
  }
}

.drawer-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0 4px;
  margin-top: 4px;
}

.drawer-footer ::v-deep .el-button {
  min-width: 88px;
  height: 40px;
  border-radius: 10px;
  font-weight: 500;
}

.drawer-footer ::v-deep .el-button--primary {
  background: linear-gradient(135deg, #7a45ff 0%, #9b5cff 100%);
  border: none;
  box-shadow: 0 6px 16px rgba(106, 53, 255, 0.28);
}

.drawer-footer ::v-deep .el-button--primary:hover {
  background: linear-gradient(135deg, #6a35ff 0%, #8a4bff 100%);
  box-shadow: 0 8px 20px rgba(106, 53, 255, 0.36);
}

.upload-box {
  width: 100%;
}

.upload-placeholder {
  width: 148px;
  height: 124px;
  border: 1px dashed #cfc1f5;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(160deg, #faf8ff 0%, #f3eeff 100%);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    border-color: #6a35ff;
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(106, 53, 255, 0.16);
  }
}

.upload-placeholder__icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7a45ff 0%, #9b5cff 100%);
  color: #fff;
  margin-bottom: 8px;
  box-shadow: 0 6px 14px rgba(106, 53, 255, 0.28);

  i {
    font-size: 20px;
  }
}

.upload-placeholder__text {
  font-size: 14px;
  color: #1d2129;
  font-weight: 500;
  line-height: 20px;
}

.upload-placeholder__tip {
  margin-top: 2px;
  font-size: 12px;
  color: #a9a2bd;
  letter-spacing: 1px;
}

.cover-preview__media {
  position: relative;
  width: 130px;
  height: 130px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(29, 33, 41, 0.12);
}

.cover-preview__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.cover-preview__media:hover img {
  transform: scale(1.06);
}

.cover-preview__mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.55) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.cover-preview__media:hover .cover-preview__mask {
  opacity: 1;
}

.cover-preview__mask .delete-btn {
  color: #fff !important;
  background: rgba(245, 108, 108, 0.9);
  border-radius: 8px;
  padding: 2px 12px;
}

.audio-preview {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(160deg, #faf8ff 0%, #f3eeff 100%);
  border: 1px solid #eee7ff;
  box-sizing: border-box;
}

.audio-preview__head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4b3a7a;
  font-size: 13px;
  font-weight: 500;

  i {
    color: #7a45ff;
    font-size: 16px;
  }
}

.audio-preview__duration {
  margin-left: auto;
  color: #8a7fb0;
  font-size: 12px;
}

.audio-preview audio {
  width: 100%;
  height: 38px;
  border-radius: 10px;
}

.delete-btn {
  width: fit-content;
  color: #f56c6c;
}

.music-drawer {
  border-radius: 18px 0 0 18px;
  box-shadow: -12px 0 40px rgba(76, 34, 175, 0.16);

  ::v-deep .el-drawer__header {
    position: relative;
    margin-bottom: 0;
    padding: 22px 28px;
    color: #fff;
    background: linear-gradient(135deg, #6a35ff 0%, #9b5cff 100%);
  }

  ::v-deep .el-drawer__close-btn {
    position: absolute;
    top: 24px;
    right: 24px;
    color: #fff;
    font-size: 20px;
    opacity: 0.85;
  }

  ::v-deep .el-drawer__close-btn:hover {
    opacity: 1;
  }

  ::v-deep .el-drawer__body {
    padding: 0;
    overflow: hidden;
    background: #f7f6fc;
  }
}

.drawer-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-title__main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title__icon {
  font-size: 20px;
}

.drawer-title__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.drawer-title__desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}
</style>