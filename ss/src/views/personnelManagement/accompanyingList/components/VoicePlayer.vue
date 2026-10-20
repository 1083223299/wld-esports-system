<template>
  <div class="voice-item" @click="togglePlay">
    <div :class="voiceIconClass"></div>
    <div :class="voiceWaveClass">
      <span style="height: 4px; margin-right: 1px;"></span>
      <span style="height: 4px; margin-right: 1px;"></span>
      <span style="height: 9px"></span>
      <span style="height: 12px; margin-right: 1px;"></span>
      <span style="height: 9px; margin-right: 1px;"></span>
      <span style="height: 14px; margin-right: 1px;"></span>
      <span style="height: 20px"></span>
      <span style="height: 17px"></span>
      <span style="height: 9px"></span>
    </div>

    <!-- 进度条 -->
    <div v-if="showProgress" class="voice-progress">
      <!-- <div class="progress-bar" :style="{ width: progress + '%' }"></div> -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'VoiceItem',
  props: {
    voice: {
      type: [Object, String], // 允许字符串
      default: () => ({
        url: '',
        duration: 0,
        status: 'idle',
        progress: 0
      }),
      validator(value) {
        // 验证器：允许对象或字符串
        if (typeof value === 'string') {
          return value.length > 0; // 字符串不能为空
        }
        return typeof value === 'object' && value !== null;
      }
    },
    voiceId: {
      type: [String, Number],
      default: ''
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    showProgress: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      audio: null,
      isLoaded: false,
      currentTime: 0,
      localStatus: 'idle'
    }
  },
  computed: {
    formattedDuration() {
      if (!this.voice.duration) return '0"'
      return `${Math.round(this.voice.duration)}"`
    },

    // ：暂停和未开始使用同一个样式
    voiceIconClass() {
      return {
        'voice-icon': true,
        // idle 和 paused 都使用相同的样式
        'voice-icon-idle': this.localStatus === 'idle' || this.localStatus === 'paused',
        'voice-icon-playing': this.localStatus === 'playing',
        'voice-icon-error': this.localStatus === 'error'
      }
    },

    // ：暂停和未开始使用同一个样式
    voiceWaveClass() {
      return {
        'voice-wave': true,
        // idle 和 paused 都使用相同的样式
        'voice-wave-idle': this.localStatus === 'idle' || this.localStatus === 'paused',
        'voice-wave-playing': this.localStatus === 'playing'
      }
    },

    progress() {
      if (this.voice.duration && this.currentTime) {
        return (this.currentTime / this.voice.duration) * 100
      }
      return 0
    }
  },
  watch: {
    'voice.status'(newVal) {
      if (newVal !== this.localStatus) {
        this.handleExternalStatusChange(newVal)
      }
    },

    isPlaying(newVal) {
      console.log('isPlaying prop changed:', newVal, 'voiceId:', this.voiceId);
      if (newVal && this.localStatus !== 'playing') {
        // 父组件指示这个语音应该播放
        this.play();
      } else if (!newVal && this.localStatus === 'playing') {
        // 父组件指示这个语音应该停止
        this.pause();
      }
    },

    localStatus(newVal) {
      this.$emit('status-change', {
        voiceId: this.voiceId,
        status: newVal,
        progress: this.progress
      })
    }
  },
  mounted() {
    this.initAudio()
  },
  beforeDestroy() {
    this.destroyAudio()
  },
  methods: {
    initAudio() {
      if (!this.voice.url) {
        this.localStatus = 'error'
        return
      }

      this.audio = new Audio(this.voice.url)

      // 绑定事件
      this.audio.addEventListener('canplaythrough', this.handleCanPlay)
      this.audio.addEventListener('timeupdate', this.handleTimeUpdate)
      this.audio.addEventListener('ended', this.handleAudioEnded)
      this.audio.addEventListener('error', this.handleAudioError)
      this.audio.addEventListener('pause', this.handleAudioPause)
      this.audio.addEventListener('play', this.handleAudioPlay)

      // 预加载
      this.audio.load()
    },

    destroyAudio() {
      if (this.audio) {
        this.stop()
        this.audio.removeEventListener('canplaythrough', this.handleCanPlay)
        this.audio.removeEventListener('timeupdate', this.handleTimeUpdate)
        this.audio.removeEventListener('ended', this.handleAudioEnded)
        this.audio.removeEventListener('error', this.handleAudioError)
        this.audio.removeEventListener('pause', this.handleAudioPause)
        this.audio.removeEventListener('play', this.handleAudioPlay)
        this.audio = null
      }
    },

    togglePlay() {
      if (!this.voice.url) {
        this.$message.warning('语音文件不存在')
        return
      }

      if (!this.isLoaded) {
        this.$message.info('语音加载中...')
        return
      }

      if (this.localStatus === 'playing') {
        this.pause()
      } else {
        this.play()
      }
    },

    async play() {
      try {
        // 通知父组件开始播放
        this.$emit('before-play', this.voiceId)

        if (this.audio) {
          await this.audio.play()
          this.localStatus = 'playing'
          this.$emit('play', {
            voiceId: this.voiceId,
            url: this.voice.url,
            duration: this.voice.duration
          })
        }
      } catch (error) {
        console.error('播放失败:', error)
        this.localStatus = 'error'
        this.$message.error('播放失败：' + error.message)
      }
    },

    pause() {
      if (this.audio) {
        this.audio.pause()
        this.localStatus = 'paused'
        this.$emit('pause', {
          voiceId: this.voiceId,
          currentTime: this.audio.currentTime
        })
      }
    },

    stop() {
      if (this.audio) {
        this.audio.pause()
        this.audio.currentTime = 0
        this.currentTime = 0
        this.localStatus = 'idle'
        this.$emit('stop', this.voiceId)
      }
    },

    handleCanPlay() {
      this.isLoaded = true
      if (!this.voice.duration) {
        this.voice.duration = this.audio.duration || 0
      }
    },

    handleTimeUpdate() {
      this.currentTime = this.audio.currentTime
      this.$emit('progress', {
        voiceId: this.voiceId,
        currentTime: this.currentTime,
        duration: this.voice.duration,
        progress: this.progress
      })
    },

    handleAudioEnded() {
      this.currentTime = 0
      this.localStatus = 'idle'
      if (this.audio) {
        this.audio.currentTime = 0
      }
      this.$emit('ended', this.voiceId)
    },

    handleAudioError(error) {
      console.error('语音播放错误:', error)
      this.localStatus = 'error'
      this.$emit('error', {
        voiceId: this.voiceId,
        error: error
      })
    },

    handleAudioPause() {
      if (this.audio && this.audio.currentTime < this.audio.duration) {
        this.localStatus = 'paused'
      }
    },

    handleAudioPlay() {
      this.localStatus = 'playing'
    },

    // 处理外部状态变化
    handleExternalStatusChange(status) {
      console.log('外部状态变化:', status, '当前状态:', this.localStatus);

      switch (status) {
        case 'playing':
          if (this.localStatus !== 'playing') {
            // 如果是从暂停状态恢复播放，不要重置时间
            if (this.localStatus === 'paused' && this.audio) {
              this.resumeFromPause();
            } else {
              this.play();
            }
          }
          break;

        case 'paused':
          if (this.localStatus === 'playing') {
            this.pause();
          }
          break;

        case 'idle':
          if (this.localStatus !== 'idle') {
            this.stop();
          }
          break;

        case 'error':
          if (this.localStatus !== 'error') {
            this.localStatus = 'error';
            if (this.audio) {
              this.audio.pause();
            }
          }
          break;
      }
    },

    // 添加从暂停状态恢复的方法
    resumeFromPause() {
      if (this.audio) {
        this.audio.play().then(() => {
          this.localStatus = 'playing';
          this.$emit('play', {
            voiceId: this.voiceId,
            url: this.voice.url,
            duration: this.voice.duration,
            currentTime: this.audio.currentTime
          });
        }).catch(error => {
          console.error('恢复播放失败:', error);
          this.localStatus = 'error';
        });
      }
    },
  }
}
</script>

<style scoped>
.voice-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  height: 32px;
  padding: 0 0;
  border-radius: 16px;
  background: #ffffff00;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  width: fit-content;
  min-width: 0;
  max-width: none;
}

.voice-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(144, 71, 248, 0.1);
}

.voice-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(144, 71, 248, 0.2);
}

.voice-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  margin-right: 0.1px;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ：暂停和未开始使用同一个样式（紫色） */
.voice-icon-idle {
  background: linear-gradient(135deg, #9047F8, #7b38d9);
  box-shadow: 0 2px 4px rgba(144, 71, 248, 0.2);
}

/* 修改：播放状态使用橙色 */
.voice-icon-playing {
  background: linear-gradient(135deg, #FF9900, #e68900);
  box-shadow: 0 2px 4px rgba(255, 153, 0, 0.2);
}

/* 删除 voice-icon-paused 样式，使用 voice-icon-idle 代替 */

.voice-icon-error {
  background: linear-gradient(135deg, #F56C6C, #e63c3c);
  box-shadow: 0 2px 4px rgba(245, 108, 108, 0.2);
}

/* 修改：暂停和未开始都显示播放图标（三角形） */
.voice-icon-idle::after {
  content: '';
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid white;
  margin-left: 2px;
}

/* 修改：播放状态显示暂停图标（两条竖线） */
.voice-icon-playing::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 10px;
  background: white;
  border-radius: 1px;
  margin-left: 4px;
}

.voice-icon-playing::before {
  content: '';
  position: absolute;
  width: 3px;
  height: 10px;
  background: white;
  border-radius: 1px;
  margin-left: -8px;
}

/* 删除 voice-icon-paused 的样式，使用 voice-icon-idle 代替 */

.voice-icon-error::after {
  content: '!';
  color: white;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.voice-wave {
  display: flex;
  align-items: center;
  height: 20px;
  flex: 0 0 auto;
  margin-right: 0;
  padding: 0 0px;
}

.voice-wave span {
  display: inline-block;
  width: 2px;
  height: 6px;
  margin-right: 1.5px;
  border-radius: 1px;
  background: #7b38d9;
  transition: all 0.3s;
}

/* ：暂停和未开始状态波形条都是紫色 */
.voice-wave-idle span {
  background: #7b38d9;
}

/* ：播放状态波形条是橙色且有动画 */
.voice-wave-playing span {
  background: #FF9900;
  animation: voiceWave 1s infinite ease-in-out;
}

.voice-wave-playing span:nth-child(1) {
  animation-delay: 0s;
  height: 4px;
}

.voice-wave-playing span:nth-child(2) {
  animation-delay: 0.15s;
  height: 6px;
}

.voice-wave-playing span:nth-child(3) {
  animation-delay: 0.3s;
  height: 8px;
}

.voice-wave-playing span:nth-child(4) {
  animation-delay: 0.45s;
  height: 6px;
}

.voice-wave-playing span:nth-child(5) {
  animation-delay: 0.6s;
  height: 4px;
}

.voice-wave-playing span:nth-child(6) {
  animation-delay: 0.75s;
  height: 6px;
}

.voice-wave-playing span:nth-child(7) {
  animation-delay: 0.9s;
  height: 8px;
}

.voice-wave-playing span:nth-child(8) {
  animation-delay: 1.05s;
  height: 6px;
}

.voice-wave-playing span:nth-child(9) {
  animation-delay: 1.2s;
  height: 4px;
}

.voice-duration {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
  min-width: 25px;
  text-align: right;
  white-space: nowrap;
}

.voice-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #9047F8, #FF9900);
  transition: width 0.3s;
  border-radius: 0 1px 1px 0;
}

/* 动画 */
@keyframes voiceWave {

  0%,
  100% {
    transform: scaleY(0.7);
    opacity: 0.7;
  }

  50% {
    transform: scaleY(1.3);
    opacity: 1;
  }
}

/* 播放状态时添加呼吸动画 */
.voice-icon-playing {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 153, 0, 0.4);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(255, 153, 0, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 153, 0, 0);
  }
}

/* 修改：简化波形条动画，所有波形条都有动画但只有播放状态时显示橙色 */
.voice-wave-playing span {
  background: #FF9900;
  animation: voiceWave 0.8s infinite ease-in-out;
}

.voice-wave-playing span:nth-child(1) {
  animation-delay: 0s;
}

.voice-wave-playing span:nth-child(2) {
  animation-delay: 0.1s;
}

.voice-wave-playing span:nth-child(3) {
  animation-delay: 0.2s;
}

.voice-wave-playing span:nth-child(4) {
  animation-delay: 0.3s;
}

.voice-wave-playing span:nth-child(5) {
  animation-delay: 0.4s;
}

.voice-wave-playing span:nth-child(6) {
  animation-delay: 0.5s;
}

.voice-wave-playing span:nth-child(7) {
  animation-delay: 0.6s;
}

.voice-wave-playing span:nth-child(8) {
  animation-delay: 0.7s;
}

.voice-wave-playing span:nth-child(9) {
  animation-delay: 0.8s;
}

@keyframes voiceWave {

  0%,
  100% {
    height: 6px;
    opacity: 0.7;
  }

  50% {
    height: 12px;
    opacity: 1;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .voice-item {
    height: 28px;
    padding: 0 0;
    width: fit-content;
    min-width: 0;
    max-width: none;
  }

  .voice-icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }

  .voice-icon-idle::after {
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid white;
  }

  .voice-wave {
    height: 16px;
    margin-right: 8px;
  }

  .voice-wave span {
    width: 1.5px;
    margin-right: 1.5px;
  }

  .voice-duration {
    font-size: 12px;
  }
}

.el-table .playing-row .voice-item {
  background: #f5f5f500 !important;
  border-color: #f5f5f500 !important;
}
</style>
