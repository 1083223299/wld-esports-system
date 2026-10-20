<template>
  <div class="container">
    <el-row :gutter="20" class="user-row">
      <el-col :xl="3" :lg="3" :md="3" :sm="4" :xs="4" class="dept-col">
        <LeftTree ref="leftTree" :tree-data="gameTreeData" :loading="gameTreeLoading" @node-click="handleNodeClick"
          :current-node-key="currentNodeKey" :expanded-keys="expandedKeys" :selected-keys="selectedKeys" />
      </el-col>
      <el-col :xl="20" :lg="20" :md="20" :sm="20" :xs="20" class="user-col">

        <!-- 主页内容 - 未选中任何菜单时显示 -->
        <div v-if="!currentModule" class="welcome-container">
          <div class="welcome-content">
            <!-- 主页欢迎页 -->
            <div v-if="!currentGameName" class="main-home-container">
              <div class="main-home-header">
                <div class="main-home-title">
                  <h1 class="main-home-main-title animate-fade-in">游戏配置管理系统</h1>
                  <p class="main-home-sub-title animate-fade-in-delay">高效管理游戏配置，提升运营效率</p>
                </div>
                <div class="main-home-visual">
                  <div class="visual-circle circle-1"></div>
                  <div class="visual-circle circle-2"></div>
                  <div class="visual-circle circle-3"></div>
                  <div class="main-home-icon animate-float">
                    <i class="el-icon-setting"></i>
                  </div>
                </div>
              </div>

              <div class="main-home-features animate-slide-up">
                <h2 class="feature-title">系统功能</h2>
                <div class="feature-grid">
                  <div class="feature-item">
                    <div class="feature-icon">
                      <i class="el-icon-edit-outline"></i>
                    </div>
                    <h3>字段管理</h3>
                    <p>灵活配置游戏字段，满足不同游戏的需求</p>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">
                      <i class="el-icon-share"></i>
                    </div>
                    <h3>区服管理</h3>
                    <p>统一管理游戏区服，支持多区服配置</p>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">
                      <i class="el-icon-user-solid"></i>
                    </div>
                    <h3>陪陪认证</h3>
                    <p>管理搭档认证信息，确保服务质量</p>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">
                      <i class="el-icon-star-on"></i>
                    </div>
                    <h3>大神认证</h3>
                    <p>管理代练认证信息，保证技术水平</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 游戏欢迎页 -->
            <div v-else class="game-welcome-container">
              <div class="home-header">
                <div class="home-title">
                  <h1 class="main-title animate-fade-in">{{ currentGameName }}管理配置</h1>
                  <p class="sub-title animate-fade-in-delay">高效管理{{ currentGameName }}配置，提升运营效率</p>
                </div>
              </div>

              <!-- 系统概览 -->
              <div class="overview-section animate-slide-up">
                <h2 class="section-title">系统概览</h2>
                <div class="overview-cards">
                  <div class="overview-card">
                    <div class="card-icon module-icon">
                      <i class="el-icon-edit-outline"></i>
                    </div>
                    <div class="card-content">
                      <div class="card-number">{{ fieldCount }}</div>
                      <div class="card-label">字段总数</div>
                    </div>
                  </div>
                  <div class="overview-card">
                    <div class="card-icon spec-icon">
                      <i class="el-icon-share"></i>
                    </div>
                    <div class="card-content">
                      <div class="card-number">{{ serverCount }}</div>
                      <div class="card-label">区服总数</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 快速导航 -->
              <div class="navigation-section animate-slide-up delay-1">
                <h2 class="section-title">快速导航</h2>
                <div class="nav-sections">
                  <!-- 搭档模块 -->
                  <div v-if="hasPartnerModules(currentProductId)" class="nav-section">
                    <h3 class="nav-section-title">搭档模块</h3>
                    <div class="nav-grid">
                      <div class="nav-item" @click="quickNavigate('partnerAuth')">
                        <div class="nav-icon">
                          <i class="el-icon-user-solid"></i>
                        </div>
                        <span>陪陪认证</span>
                      </div>
                      <div class="nav-item" @click="quickNavigate('partnerPrice')">
                        <div class="nav-icon">
                          <i class="el-icon-money"></i>
                        </div>
                        <span>价格配置</span>
                      </div>
                      <div class="nav-item" @click="quickNavigate('partnerGameZone')">
                        <div class="nav-icon">
                          <i class="el-icon-map-location"></i>
                        </div>
                        <span>游戏专区</span>
                      </div>
                      <div class="nav-item" @click="quickNavigate('partnerOneClick')">
                        <div class="nav-icon">
                          <i class="el-icon-s-grid"></i>
                        </div>
                        <span>一键安排</span>
                      </div>
                    </div>
                  </div>

                  <!-- 代练模块 -->
                  <div v-if="hasDriverModules(currentProductId)" class="nav-section">
                    <h3 class="nav-section-title">代练模块</h3>
                    <div class="nav-grid">
                      <div class="nav-item" @click="quickNavigate('driverAuth')">
                        <div class="nav-icon">
                          <i class="el-icon-star-on"></i>
                        </div>
                        <span>大神认证</span>
                      </div>
                      <div class="nav-item" @click="quickNavigate('driverOrderField')">
                        <div class="nav-icon">
                          <i class="el-icon-document"></i>
                        </div>
                        <span>订单字段</span>
                      </div>
                      <div class="nav-item" @click="quickNavigate('driverSpec')">
                        <div class="nav-icon">
                          <i class="el-icon-s-order"></i>
                        </div>
                        <span>商品规格</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 字段管理 -->
        <FieldManage v-if="currentModule === 'field'" :key="`field-${currentProductId}`" :game-name="currentGameName"
          :product-id="currentProductId" />

        <!-- 区服管理 -->
        <ServerManage v-else-if="currentModule === 'server'" :key="`server-${currentProductId}`" :game-name="currentGameName"
          :product-id="currentProductId" />

        <!-- 搭档/代练各模块 -->
        <TreeTableCommon v-else-if="currentModule && treeConfigs[currentModule]"
          :key="`${currentProductId}-${currentModule}`" :game-name="currentGameName"
          :config="treeConfigs[currentModule]" :table-data="treeDataMap[currentModule]" :product-id="currentProductId"
          :business-type="getBusinessType(currentModule)" :module-type="getModuleType(currentModule)"
          @update="val => treeDataMap[currentModule] = val" />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import LeftTree from './components/LeftTree.vue';
import FieldManage from './components/FieldManage.vue';
import ServerManage from './components/ServerManage.vue';
import TreeTableCommon from './components/TreeTableCommon.vue';
import { productList } from '@/api/goodsList';
import { productFieldList, productServerList } from '@/api/goodsArea';

// 通用树形表格配置
const treeTableConfig = {
  partnerAuth: {
    title: '陪陪认证',
    permission: 'goodsArea:partnerAuth',
    module: 'partnerAuth'  // ✅ 添加 module 属性
  },
  partnerPrice: {
    title: '价格配置',
    permission: 'goodsArea:partnerPrice',
    module: 'partnerPrice'  // ✅ 添加 module 属性
  },
  partnerGameZone: {
    title: '游戏专区',
    permission: 'goodsArea:partnerGameZone',
    module: 'partnerGameZone'  // ✅ 添加 module 属性
  },
  partnerOneClick: {
    title: '一键安排',
    permission: 'goodsArea:partnerOneClick',
    module: 'partnerOneClick'  // ✅ 添加 module 属性
  },
  driverAuth: {
    title: '大神认证',
    permission: 'goodsArea:driverAuth',
    module: 'driverAuth'  // ✅ 添加 module 属性
  },
  driverOrderField: {
    title: '订单字段',
    permission: 'goodsArea:driverOrderField',
    module: 'driverOrderField'  // ✅ 添加 module 属性
  },
  driverSpec: {
    title: '商品规格',
    permission: 'goodsArea:driverSpec',
    module: 'driverSpec'  // ✅ 添加 module 属性
  }
};

// 复制数据函数（避免引用）
const clone = (data) => {
  if (data === undefined || data === null) {
    return data;
  }
  return JSON.parse(JSON.stringify(data));
};

export default {
  name: 'GoodsArea',
  components: { LeftTree, FieldManage, ServerManage, TreeTableCommon },
  data() {
    return {
      gameTreeData: [],
      gameTreeLoading: true,
      currentGameName: '',
      currentProductIdValue: '',
      currentModule: '',
      treeConfigs: treeTableConfig,
      treeDataMap: {},
      // 缓存对象，用于存储API调用结果
      countCache: {
        field: {},
        server: {}
      },
      // 字段和区服数量（用于模板显示）
      fieldCount: 0,
      serverCount: 0
    };
  },
  computed: {
    // 计算配置模块总数
    totalModules() {
      let count = 0;
      this.gameTreeData.forEach(game => {
        if (game.children) {
          count += game.children.length;
        }
      });
      return count;
    },
    // 计算规格总数
    totalSpecs() {
      let count = 0;
      Object.keys(this.treeDataMap).forEach(key => {
        const data = this.treeDataMap[key];
        const countSpecs = (items) => {
          items.forEach(item => {
            count++;
            if (item.children && item.children.length > 0) {
              countSpecs(item.children);
            }
          });
        };
        countSpecs(data);
      });
      return count;
    },
    // 当前选中的节点key
    currentNodeKey() {
      if (!this.currentProductId) {
        return 0;
      }
      for (const game of this.gameTreeData) {
        if (String(game.productId) === String(this.currentProductId)) {
          if (this.currentModule) {
            if (game.children) {
              for (const child of game.children) {
                if (child.module === this.currentModule) {
                  return child.id;
                }
                // 检查子节点的子节点
                if (child.children) {
                  for (const grandchild of child.children) {
                    if (grandchild.module === this.currentModule) {
                      return grandchild.id;
                    }
                  }
                }
              }
            }
          }
          return game.id;
        }
      }
      return null;
    },
    // 展开的节点key
    expandedKeys() {
      const keys = [];
      if (!this.currentProductId) {
        return keys;
      }
      for (const game of this.gameTreeData) {
        if (String(game.productId) === String(this.currentProductId)) {
          keys.push(game.id);
          if (this.currentModule) {
            if (game.children) {
              for (const child of game.children) {
                if (child.module === this.currentModule) {
                  // 展开子节点
                  keys.push(child.id);
                  break;
                }
                // 检查子节点的子节点
                if (child.children) {
                  for (const grandchild of child.children) {
                    if (grandchild.module === this.currentModule) {
                      // 展开子节点和孙子节点
                      keys.push(child.id);
                      keys.push(grandchild.id);
                      break;
                    }
                  }
                }
              }
            }
          }
          break;
        }
      }
      return keys;
    },
    // 当前商品ID
    currentProductId() {
      return this.currentProductIdValue;
    },
    // 选中的节点key
    selectedKeys() {
      const keys = [];
      if (!this.currentProductId) {
        keys.push(0);
        return keys;
      }
      for (const game of this.gameTreeData) {
        if (String(game.productId) === String(this.currentProductId)) {
          keys.push(game.id);
          if (this.currentModule) {
            if (game.children) {
              for (const child of game.children) {
                if (child.module === this.currentModule) {
                  // 选中子节点
                  keys.push(child.id);
                  break;
                }
                // 检查子节点的子节点
                if (child.children) {
                  for (const grandchild of child.children) {
                    if (grandchild.module === this.currentModule) {
                      // 选中子节点和孙子节点
                      keys.push(child.id);
                      keys.push(grandchild.id);
                      break;
                    }
                  }
                }
              }
            }
          }
          break;
        }
      }
      return keys;
    }
  },
  created() {
    // 初始化各模块数据
    Object.keys(this.treeConfigs).forEach(key => {
      if (this.treeConfigs[key].data) {
        this.treeDataMap[key] = clone(this.treeConfigs[key].data);
      } else {
        this.treeDataMap[key] = [];
      }
    });

    // 获取商品列表数据并生成游戏菜单树
    this.fetchProductList();
  },
  watch: {
    // 监听当前商品变化，更新字段和区服数量
    currentProductId: {
      handler(newVal) {
        if (newVal) {
          this.updateCounts();
        } else {
          this.fieldCount = 0;
          this.serverCount = 0;
        }
      },
      immediate: true
    }
  },
  methods: {
    // 更新字段和区服数量
    async updateCounts() {
      const productId = this.currentProductId;
      this.fieldCount = await this.getFieldCount(productId);
      this.serverCount = await this.getServerCount(productId);
    },
    // 获取商品列表数据
    async fetchProductList() {
      this.gameTreeLoading = true;
      try {
        const res = await productList({});
        if (res.success && res.data && res.data.rows) {
          this.generateGameTree(res.data.rows);
        } else {
          this.gameTreeData = [];
        }
      } catch (error) {
        console.error('获取商品列表失败:', error);
        this.gameTreeData = [];
      } finally {
        this.$nextTick(() => {
          window.requestAnimationFrame(() => {
            this.gameTreeLoading = false;
          });
        });
      }
    },
    // 根据商品列表数据生成游戏菜单树
    generateGameTree(products) {
      this.gameTreeData = (products || []).map(product => {
        const productId = String(product.id);
        const game = {
          id: `game-${productId}`,
          label: product.productName,
          level: 1,
          productId: product.id,
          children: [
            {
              id: `game-${productId}-field`,
              label: '字段管理',
              level: 2,
              module: 'field',
              productId: product.id
            },
            {
              id: `game-${productId}-server`,
              label: '区服管理',
              level: 2,
              module: 'server',
              productId: product.id
            }
          ]
        };

        const businessTypes = this.normalizeBusinessTypes(product.businessType);

        if (businessTypes.includes('1')) {
          game.children.push({
            id: `game-${productId}-partner`,
            label: '搭档',
            level: 2,
            productId: product.id,
            children: [
              {
                id: `game-${productId}-partner-auth`,
                label: '陪陪认证',
                level: 3,
                module: 'partnerAuth',
                productId: product.id
              },
              {
                id: `game-${productId}-partner-price`,
                label: '价格配置',
                level: 3,
                module: 'partnerPrice',
                productId: product.id
              },
              {
                id: `game-${productId}-partner-game-zone`,
                label: '游戏专区',
                level: 3,
                module: 'partnerGameZone',
                productId: product.id
              },
              {
                id: `game-${productId}-partner-one-click`,
                label: '一键安排',
                level: 3,
                module: 'partnerOneClick',
                productId: product.id
              }
            ]
          });
        }

        if (businessTypes.includes('2')) {
          game.children.push({
            id: `game-${productId}-driver`,
            label: '代练',
            level: 2,
            productId: product.id,
            children: [
              {
                id: `game-${productId}-driver-auth`,
                label: '大神认证',
                level: 3,
                module: 'driverAuth',
                productId: product.id
              },
              {
                id: `game-${productId}-driver-order-field`,
                label: '订单字段',
                level: 3,
                module: 'driverOrderField',
                productId: product.id
              },
              {
                id: `game-${productId}-driver-spec`,
                label: '商品规格',
                level: 3,
                module: 'driverSpec',
                productId: product.id
              }
            ]
          });
        }

        return game;
      });
    },
    handleNodeClick(data) {
      if (data.level === 1) {
        if (data.id === 0) {
          this.currentGameName = '';
          this.currentProductIdValue = '';
          this.currentModule = '';
        } else {
          this.currentGameName = data.label;
          this.currentProductIdValue = data.productId || '';
          this.currentModule = data.module || '';
        }
        return;
      }
      const game = this.findGameByNode(data);
      if (data.module) {
        this.currentGameName = game ? game.label : '';
        this.currentProductIdValue = game ? game.productId : '';
        this.currentModule = data.module;
      } else {
        this.currentGameName = game ? game.label : '';
        this.currentProductIdValue = game ? game.productId : '';
        this.currentModule = '';
      }
    },
    normalizeBusinessTypes(businessType) {
      if (Array.isArray(businessType)) {
        return businessType.map(item => String(item));
      }
      if (businessType === null || businessType === undefined || businessType === '') {
        return [];
      }
      return String(businessType)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    },
    findGameName(node) {
      const game = this.findGameByNode(node);
      return game ? game.label : '';
    },
    findGameByNode(node) {
      for (const game of this.gameTreeData) {
        if (this.isDescendant(game, node)) return game;
      }
      return null;
    },
    isDescendant(parent, target) {
      if (parent.id === target.id) return true;
      if (parent.children) {
        for (const child of parent.children) {
          if (this.isDescendant(child, target)) return true;
        }
      }
      return false;
    },
    // 快捷导航
    quickNavigate(module) {
      const targetGame = this.currentProductId
        ? this.gameTreeData.find(game => String(game.productId) === String(this.currentProductId))
        : this.gameTreeData[0];
      if (!targetGame) return;

      this.currentGameName = targetGame.label;
      this.currentProductIdValue = targetGame.productId;
      this.currentModule = module;

      this.$nextTick(() => {
        const findModuleNode = (nodes) => {
          for (const node of nodes) {
            if (node.module === module) {
              return node.id;
            }
            if (node.children && node.children.length) {
              const found = findModuleNode(node.children);
              if (found) return found;
            }
          }
          return null;
        };

        const targetNodeId = findModuleNode(targetGame.children);

        if (targetNodeId && this.$refs.leftTree) {
          this.$refs.leftTree.setSelectedAndExpand([targetNodeId]);
        }
      });
    },
    // 获取字段管理数量
    async getFieldCount(productId) {
      if (!productId) return 0;
      if (Object.prototype.hasOwnProperty.call(this.countCache.field, productId)) {
        return this.countCache.field[productId];
      }

      try {
        const response = await productFieldList({ productId });
        const count = response.data.total || 0;
        this.countCache.field[productId] = count;
        return count;
      } catch (error) {
        console.error('获取字段管理数量失败:', error);
        return 0;
      }
    },
    // 获取区服管理数量
    async getServerCount(productId) {
      if (!productId) return 0;
      if (Object.prototype.hasOwnProperty.call(this.countCache.server, productId)) {
        return this.countCache.server[productId];
      }

      try {
        const response = await productServerList({ productId });
        const responseData = response && response.data;
        let count = 0;
        if (responseData && typeof responseData.total === 'number') {
          count = responseData.total;
        } else {
          const rows = Array.isArray(responseData)
            ? responseData
            : Array.isArray(responseData && responseData.rows)
              ? responseData.rows
              : [];
          count = this.countTreeNodes(rows);
        }
        this.countCache.server[productId] = count;
        return count;
      } catch (error) {
        console.error('获取区服管理数量失败:', error);
        return 0;
      }
    },
    countTreeNodes(list) {
      if (!Array.isArray(list)) return 0;
      return list.reduce((total, item) => {
        const childrenCount = this.countTreeNodes(item.children);
        return total + 1 + childrenCount;
      }, 0);
    },
    // 检查是否有搭档模块
    hasPartnerModules(productId) {
      const game = this.gameTreeData.find(g => String(g.productId) === String(productId));
      if (!game) return false;

      return game.children && game.children.some(child => child.label === '搭档');
    },
    // 检查是否有代练模块
    hasDriverModules(productId) {
      const game = this.gameTreeData.find(g => String(g.productId) === String(productId));
      if (!game) return false;

      return game.children && game.children.some(child => child.label === '代练');
    },
    // 根据模块获取业务类型
    getBusinessType(module) {
      if (module.startsWith('partner')) {
        return '1'; // 搭档
      } else if (module.startsWith('driver')) {
        return '2'; // 代练
      }
      return '';
    },
    // 根据模块获取模块类型
    getModuleType(module) {
      switch (module) {
        case 'partnerAuth':
        case 'driverAuth':
          return '1'; // 陪陪认证/大神认证
        case 'partnerSpec':
        case 'driverSpec':
          return '2'; // 商品规格
        case 'partnerGameZone':
          return '3'; // 游戏专区
        case 'driverOrderField':
          return '5'; // 订单字段
        case 'partnerPrice':
          return '6'; // 价格配置
        case 'partnerOneClick':
          return '7'; // 一键安排
        default:
          return '';
      }
    }
  }
};
</script>

<style scoped>
.container {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.user-row {
  height: 100%;
  display: flex;
}

.dept-col {
  height: 100%;
  min-width: 260px;
}

.user-col {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 主页样式 */
.welcome-container {
  flex: 1;
  background: #ffffff;
  border-radius: 24px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 30px;
  max-height: calc(100vh - 120px);
}

.welcome-content {
  width: 100%;
  position: relative;
  z-index: 1;
}

/* 主页头部 */
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.home-title {
  flex: 1;
  min-width: 200px;
}

.main-title {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sub-title {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 主页欢迎页样式 */
.main-home-container {
  width: 100%;
}

.main-home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 60px;
  flex-wrap: wrap;
  gap: 40px;
}

.main-home-title {
  flex: 1;
  min-width: 300px;
}

.main-home-main-title {
  font-size: 42px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.main-home-sub-title {
  font-size: 18px;
  color: #666;
  line-height: 1.5;
  max-width: 500px;
}

.main-home-visual {
  position: relative;
  width: 300px;
  height: 300px;
  flex-shrink: 0;
}

.visual-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(106, 53, 255, 0.1), rgba(143, 24, 238, 0.1));
  animation: float 8s ease-in-out infinite;
}

.visual-circle.circle-1 {
  width: 200px;
  height: 200px;
  top: 0;
  left: 0;
  animation-delay: 0s;
}

.visual-circle.circle-2 {
  width: 150px;
  height: 150px;
  bottom: 0;
  right: 0;
  animation-delay: 2s;
}

.visual-circle.circle-3 {
  width: 100px;
  height: 100px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 4s;
}

.main-home-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(106, 53, 255, 0.3);
  z-index: 1;
}

.main-home-icon i {
  font-size: 60px;
  color: #ffffff;
}

.main-home-features {
  margin-bottom: 60px;
}

.feature-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-title::before {
  content: '';
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  border-radius: 2px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.feature-item {
  background: #f8f9fc;
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
}

.feature-item:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(106, 53, 255, 0.15);
  border-color: #6A35FF;
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0e6ff, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #6A35FF;
  margin: 0 auto 20px;
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon {
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  color: #ffffff;
}

.feature-item h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.feature-item p {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}



/* 游戏欢迎页 */
.game-welcome-container {
  width: 100%;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .welcome-container {
    padding: 20px;
    margin-left: 10px;
    margin-right: 10px;
  }

  .main-title {
    font-size: 20px;
  }

  .sub-title {
    font-size: 13px;
  }

  .home-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .home-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .overview-cards {
    grid-template-columns: 1fr;
  }

  .nav-section {
    min-width: 100%;
  }

  .nav-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .section-title {
    font-size: 18px;
  }

  .card-number {
    font-size: 20px;
  }

  .card-label {
    font-size: 13px;
  }

  /* 主页欢迎页响应式 */
  .main-home-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .main-home-title {
    min-width: 100%;
  }

  .main-home-main-title {
    font-size: 32px;
  }

  .main-home-visual {
    width: 200px;
    height: 200px;
  }

  .main-home-icon {
    width: 80px;
    height: 80px;
  }

  .main-home-icon i {
    font-size: 40px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}

.home-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(106, 53, 255, 0.2);
}

/* 系统概览 */
.overview-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  border-radius: 2px;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.overview-card {
  background: #f8f9fc;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.overview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(106, 53, 255, 0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ffffff;
}

.game-icon {
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
}

.module-icon {
  background: linear-gradient(135deg, #409EFF, #69c0ff);
}

.spec-icon {
  background: linear-gradient(135deg, #67C23A, #85ce61);
}

.user-icon {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
}

.card-content {
  flex: 1;
}

.card-number {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #666;
}

/* 快速导航 */
.navigation-section {
  margin-bottom: 40px;
}

.nav-sections {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.nav-section {
  flex: 1;
  min-width: 250px;
  background: #f8f9fc;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  border-radius: 2px;
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.nav-item {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.nav-item:hover {
  border-color: #6A35FF;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(106, 53, 255, 0.1);
}

.nav-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0e6ff, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #6A35FF;
  transition: all 0.3s ease;
}

.nav-item:hover .nav-icon {
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  color: #ffffff;
}

.nav-item span {
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
}

.nav-item:hover span {
  color: #6A35FF;
  font-weight: 500;
}

/* 使用方法 */
.usage-section {
  margin-bottom: 20px;
}

.usage-list {
  background: #f8f9fc;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.usage-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e4e7ed;
}

.usage-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.usage-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #ffffff;
  flex-shrink: 0;
}

.usage-content {
  flex: 1;
}

.usage-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.usage-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #f8f9fc;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
}

.quick-item:hover {
  background: #ffffff;
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(106, 53, 255, 0.2);
  border-color: #6A35FF;
}

.quick-item:hover .quick-item-icon i {
  color: #6A35FF;
  transform: scale(1.2);
}

.quick-item:hover span {
  color: #6A35FF;
  font-weight: 600;
}

.quick-item-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0e6ff, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.quick-item-icon i {
  font-size: 32px;
  color: #6A35FF;
  transition: all 0.3s ease;
}

.quick-item span {
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.quick-item-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #6A35FF, #8F18EE);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.quick-item:hover .quick-item-bg {
  opacity: 0.05;
}

/* 动画效果 */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
  opacity: 0;
}

.animate-fade-in-delay {
  animation: fadeIn 0.8s ease-out 0.3s forwards;
  opacity: 0;
}

.animate-slide-up {
  animation: slideUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(30px);
}

.animate-slide-up.delay-1 {
  animation-delay: 0.1s;
}

.animate-slide-up.delay-2 {
  animation-delay: 0.2s;
}

.animate-slide-up.delay-3 {
  animation-delay: 0.3s;
}

.animate-slide-up.delay-4 {
  animation-delay: 0.4s;
}

.animate-slide-up.delay-5 {
  animation-delay: 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
