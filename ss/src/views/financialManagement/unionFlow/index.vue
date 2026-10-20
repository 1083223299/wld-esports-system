<template>
	<div class="container">
		<!-- keep-alive 缓存指定组件，include 对应子组件 name -->
		<keep-alive :include="['ListCompanion']">
			<component :is="currentComponent" ref="dynamicComponent" @switch-to-list="handleSwitchToList"
			@refresh-list="handleRefreshList"></component>
		</keep-alive>
	</div>
</template>

<script>
// 导入子组件
import ListCompanion from './list.vue'

export default {
	name: 'UnionFlow',
	components: {
		ListCompanion
	},
	data() {
		return {
			// 当前显示的组件
			currentComponent: 'ListCompanion',
			// 父子组件共享数据（用于编辑传参）
			sharedData: {
				editId: null,
				editRow: null
			}
		}
	},
	methods: {
		// 切换到列表页
		handleSwitchToList() {
			this.currentComponent = 'ListCompanion'
		},
		// 刷新列表数据
		handleRefreshList() {
			const listComp = this.$refs.dynamicComponent
			if (listComp && listComp.fetchTableData) {
				listComp.fetchTableData()
			}
		}
	},
	// 向子组件注入方法和数据
	provide() {
		return {
			switchToList: this.handleSwitchToList
		}
	}
}
</script>

<style scoped>
.container {
	padding: 20px;
	/* background: #f5f5f5;
    min-height: 100vh; */
	overflow-y: scroll;
	height: 100%;
}
</style>