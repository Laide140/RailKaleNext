<template>
	<view class="settings">
		<!-- 首页布局 -->
		<view class="group">
			<text class="group-title">首页布局</text>
			<view class="layout-options">
				<view class="layout-option" :class="{ active: homeLayout === 'card' }" @tap="setLayout('card')">
					<view class="layout-preview card-preview">
						<view class="mini-card" v-for="i in 3" :key="i"></view>
					</view>
					<text class="layout-label">分区卡片</text>
				</view>
				<view class="layout-option" :class="{ active: homeLayout === 'grid' }" @tap="setLayout('grid')">
					<view class="layout-preview grid-preview">
						<view class="mini-icon" v-for="i in 9" :key="i"></view>
					</view>
					<text class="layout-label">宫格</text>
				</view>
				<view class="layout-option" :class="{ active: homeLayout === 'custom' }" @tap="setLayout('custom')">
					<view class="layout-preview custom-preview">
						<view class="mini-bigcard" v-for="i in 2" :key="i"></view>
					</view>
					<text class="layout-label">自定义</text>
				</view>
			</view>
		</view>

		<!-- API 源 -->
		<view class="group">
			<text class="group-title">API 源</text>
			<view class="api-options">
				<view class="api-option" :class="{ active: apiSource === 'next' }" @tap="setApiSource('next')">
					<view class="api-top">
						<text class="api-name">新</text>
						<text class="api-badge">推荐</text>
					</view>
					<text class="api-host">next.laide.net.cn</text>
				</view>
				<view class="api-option" :class="{ active: apiSource === 'old' }" @tap="setApiSource('old')">
					<view class="api-top">
						<text class="api-name">旧</text>
					</view>
					<text class="api-host">rail.laide.asia</text>
				</view>
				<view class="api-option" :class="{ active: apiSource === 'railgo' }" @tap="setApiSource('railgo')">
					<view class="api-top">
						<text class="api-name">RailGo</text>
						<text class="api-badge friend">友商</text>
					</view>
					<text class="api-host">rg-api.zenglingkun.cn</text>
				</view>
			</view>
			<text class="api-hint">RailGo 仅支持车站大屏、检票口、线路图；其余功能自动使用新源数据。</text>
		</view>

		<!-- 主题色 -->
		<view class="group">
			<text class="group-title">主题色</text>
			<view class="swatches">
				<view class="swatch-wrap" v-for="(c, i) in presets" :key="i">
					<view
						class="swatch"
						:style="{ backgroundColor: c }"
						:class="{ selected: themeColor.toLowerCase() === c }"
						@tap="setTheme(c)"
					>
						<i v-if="themeColor.toLowerCase() === c" class="fas fa-check swatch-check"></i>
					</view>
				</view>
			</view>

			<!-- 自定义调色器 -->
			<view class="custom-picker">
				<view class="picker-preview-row">
					<view class="picker-preview" :style="{ backgroundColor: pickerColor }"></view>
					<input class="hex-input" v-model="hexInput" placeholder="#007aff" @confirm="applyHex" @blur="applyHex" />
					<button class="picker-confirm" @tap="confirmCustomColor">应用</button>
				</view>
				<view class="slider-row">
					<text class="slider-label">色相</text>
					<slider :value="hsl.h" :min="0" :max="360" activeColor="#007aff" backgroundColor="#e5e5ea" block-size="20" @change="onHue" @changing="onHue" />
				</view>
				<view class="slider-row">
					<text class="slider-label">饱和</text>
					<slider :value="hsl.s" :min="0" :max="100" activeColor="#007aff" backgroundColor="#e5e5ea" block-size="20" @change="onSat" @changing="onSat" />
				</view>
				<view class="slider-row">
					<text class="slider-label">亮度</text>
					<slider :value="hsl.l" :min="0" :max="100" activeColor="#007aff" backgroundColor="#e5e5ea" block-size="20" @change="onLight" @changing="onLight" />
				</view>
			</view>
		</view>

		<!-- 接口密钥 -->
		<view class="group">
			<text class="group-title">接口密钥</text>
			<view class="key-row" v-for="kd in keyDefs" :key="kd.id" @tap="editKey(kd)">
				<view class="key-info">
					<text class="key-label">{{ kd.label }}</text>
					<text class="key-desc">{{ kd.desc }}</text>
				</view>
				<view class="key-right">
					<text class="key-state" :class="{ custom: keyIsCustom(kd.id) }">{{ keyStateText(kd.id) }}</text>
					<text class="row-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 自定义卡片 -->
		<view class="group" v-if="homeLayout === 'custom'">
			<view class="card-manage-header">
				<text class="group-title">我的卡片</text>
				<text class="manage-btn" @tap="goEditor">管理 ›</text>
			</view>
			<view class="custom-card-list">
				<view class="custom-card-item" v-for="card in customCards" :key="card.id">
					<view class="cc-icon" :style="{ backgroundColor: card.color }">
						<i class="fas fa-th-large"></i>
					</view>
					<text class="cc-name">{{ card.title || '未命名卡片' }}</text>
					<text class="cc-count">{{ card.features.length }} 个功能</text>
				</view>
				<view class="custom-card-item empty" v-if="!customCards.length" @tap="goEditor">
					<i class="fas fa-plus"></i>
					<text class="cc-name">添加卡片</text>
				</view>
			</view>
		</view>

		<view class="footer">铁路万花筒</view>
	</view>
</template>

<script>
	import { hslToHex, hexToHsl } from '@/common/color.js'
	import { KEY_DEFS } from '@/common/keys.js'

	export default {
		data() {
			return {
				presets: [
					'#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
					'#5856d6', '#5ac8fa', '#ff2d55', '#00c7be', '#8e8e93'
				],
				pickerColor: '#007aff',
				hsl: { h: 210, s: 100, l: 50 },
				hexInput: '#007aff',
				keyDefs: KEY_DEFS,
			}
		},
		computed: {
			homeLayout() { return this.$store.state.settings.homeLayout },
			themeColor() { return this.$store.state.settings.themeColor },
			apiSource() { return this.$store.state.settings.apiSource || 'next' },
			customCards() { return this.$store.state.settings.customCards },
			settingsKeys() { return this.$store.state.settings.keys || {} }
		},
		onLoad() {
			const tc = this.themeColor
			this.pickerColor = tc
			this.hsl = hexToHsl(tc)
			this.hexInput = tc
		},
		methods: {
			setLayout(layout) {
				this.$store.commit('setSettings', { homeLayout: layout })
			},
			setApiSource(src) {
				if (src === this.apiSource) return
				if (src === 'railgo') {
					uni.showModal({
						title: 'RailGo API',
						content: '部分功能不支持RailGo API，将使用新api作为备选数据源',
						showCancel: true,
						confirmText: '确定',
						cancelText: '取消',
						success: (res) => {
							if (res.confirm) {
								this.$store.commit('setSettings', { apiSource: 'railgo' })
								uni.showToast({ title: '已切换到 RailGo', icon: 'none' })
							}
						}
					})
					return
				}
				this.$store.commit('setSettings', { apiSource: src })
				uni.showToast({ title: src === 'next' ? '已切换到新 API' : '已切换到旧 API', icon: 'none' })
			},
			setTheme(color) {
				this.$store.commit('setSettings', { themeColor: color })
				this.pickerColor = color
				this.hsl = hexToHsl(color)
				this.hexInput = color
				uni.showToast({ title: '主题色已更新', icon: 'none' })
			},
			onHue(e) { this.hsl.h = Number(e.detail.value); this.syncPicker() },
			onSat(e) { this.hsl.s = Number(e.detail.value); this.syncPicker() },
			onLight(e) { this.hsl.l = Number(e.detail.value); this.syncPicker() },
			syncPicker() {
				this.pickerColor = hslToHex(this.hsl.h, this.hsl.s, this.hsl.l)
				this.hexInput = this.pickerColor
			},
			applyHex() {
				const c = this.normalizeHex(this.hexInput)
				if (c) {
					this.pickerColor = c
					this.hsl = hexToHsl(c)
					this.hexInput = c
				}
			},
			confirmCustomColor() {
				this.applyHex()
				this.$store.commit('setSettings', { themeColor: this.pickerColor })
				uni.showToast({ title: '主题色已更新', icon: 'none' })
			},
			normalizeHex(v) {
				let s = String(v || '').trim().replace('#', '')
				if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('')
				return /^[0-9a-fA-F]{6}$/.test(s) ? '#' + s.toLowerCase() : null
			},
			goEditor() {
				uni.navigateTo({ url: '/pages/custom-editor/custom-editor' })
			},
			keyStateText(id) {
				const v = this.settingsKeys[id]
				if (v && v !== 'default' && v !== '') return '自定义'
				return '官方（默认）'
			},
			keyIsCustom(id) {
				const v = this.settingsKeys[id]
				return !!(v && v !== 'default' && v !== '')
			},
			editKey(kd) {
				const self = this
				const isCustom = this.keyIsCustom(kd.id)
				uni.showActionSheet({
					itemList: isCustom
						? ['使用官方默认', '自定义填写密钥']
						: ['官方（默认）', '自定义填写密钥'],
					success: (res) => {
						if (res.tapIndex === 0) {
							const keys = { ...self.settingsKeys, [kd.id]: 'default' }
							self.$store.commit('setSettings', { keys })
							uni.showToast({ title: `${kd.label} 已设为官方默认`, icon: 'none' })
						} else {
							uni.showModal({
								title: `填写${kd.label}密钥`,
								editable: true,
								placeholderText: '粘贴你的 API Key',
								content: isCustom ? self.settingsKeys[kd.id] : '',
								success: (m) => {
									if (m.confirm && m.content && m.content.trim()) {
										const keys = { ...self.settingsKeys, [kd.id]: m.content.trim() }
										self.$store.commit('setSettings', { keys })
										uni.showToast({ title: '密钥已更新', icon: 'none' })
									}
								}
							})
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss">
	.settings { min-height: 100vh; background: var(--bg); padding: 16px 16px 40px; }

	.group {
		background: var(--card);
		border-radius: 14px;
		padding: 16px;
		margin-bottom: 16px;
	}
	.group-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		display: block;
		margin-bottom: 14px;
	}

	/* ===== API 源 ===== */
	.api-options { display: flex; gap: 8px; }
	.api-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 10px;
		border-radius: 12px;
		background: var(--card2);
		border: 2px solid transparent;
		transition: border-color 0.2s;
		&.active { border-color: var(--blue); }
	}
	.api-top { display: flex; align-items: center; gap: 4px; }
	.api-name { font-size: 15px; font-weight: 700; color: var(--label); }
	.api-badge {
		font-size: 10px;
		font-weight: 600;
		color: #fff;
		background: #34c759;
		border-radius: 6px;
		padding: 1px 5px;
		&.friend { background: #af52de; }
	}
	.api-host { font-size: 10px; color: var(--secondary); word-break: break-all; }
	.api-hint { display: block; font-size: 11px; color: var(--secondary); margin-top: 10px; line-height: 1.5; }

	/* ===== Layout ===== */
	.layout-options { display: flex; gap: 10px; }
	.layout-option {
		flex: 1;
		border: 2px solid transparent;
		border-radius: 12px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		transition: border-color 0.2s;
		&.active { border-color: var(--blue); }
	}
	.layout-preview {
		width: 100%;
		height: 68px;
		border-radius: 8px;
		background: var(--card2);
		padding: 6px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 5px;
		overflow: hidden;
	}
	.mini-card { height: 14px; border-radius: 3px; background: var(--card); border: 1px solid var(--separator); }
	.grid-preview { flex-direction: row; flex-wrap: wrap; gap: 4px; }
	.mini-icon { width: 22%; height: 18px; border-radius: 3px; background: var(--card); border: 1px solid var(--separator); }
	.mini-bigcard { height: 26px; border-radius: 4px; background: var(--card); border: 1px solid var(--separator); }
	.layout-label { font-size: 13px; color: var(--label); font-weight: 500; }

	/* ===== Swatches ===== */
	.swatches { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
	.swatch-wrap { width: calc(20% - 10px); display: flex; justify-content: center; }
	.swatch {
		width: 38px; height: 38px;
		border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		border: 2px solid rgba(0,0,0,0.06);
		box-shadow: 0 2px 6px rgba(0,0,0,0.1);
		&.selected { border: 3px solid #fff; outline: 2px solid var(--blue); }
	}
	.swatch-check { color: #fff; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }

	/* ===== Custom Picker ===== */
	.custom-picker {
		background: var(--card2);
		border-radius: 12px;
		padding: 14px;
	}
	.picker-preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
	.picker-preview {
		width: 44px; height: 44px;
		border-radius: 10px;
		border: 2px solid var(--card);
		box-shadow: 0 2px 6px rgba(0,0,0,0.15);
		flex-shrink: 0;
	}
	.hex-input {
		flex: 1;
		font-size: 16px;
		color: var(--label);
		background: var(--card);
		border-radius: 8px;
		padding: 8px 12px;
		border: 1px solid var(--separator);
	}
	.picker-confirm {
		flex-shrink: 0;
		background: var(--blue);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		border-radius: 8px;
		padding: 0 16px;
		height: 38px;
		line-height: 38px;
		border: none;
		margin: 0;
	}
	.slider-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
	.slider-label { font-size: 12px; color: var(--secondary); width: 30px; flex-shrink: 0; }
	.slider-row slider { flex: 1; }

	/* ===== Keys ===== */
	.key-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 0;
		border-bottom: 0.5px solid var(--separator);
		&:last-child { border-bottom: none; }
	}
	.key-info { display: flex; flex-direction: column; gap: 2px; }
	.key-label { font-size: 15px; color: var(--label); font-weight: 600; }
	.key-desc { font-size: 12px; color: var(--secondary); }
	.key-right { display: flex; align-items: center; gap: 8px; }
	.key-state {
		font-size: 13px; color: var(--secondary);
		&.custom { color: var(--blue); font-weight: 600; }
	}
	.row-arrow { font-size: 20px; color: var(--secondary); font-weight: 300; line-height: 1; }

	/* ===== Custom Cards ===== */
	.card-manage-header { display: flex; justify-content: space-between; align-items: center; }
	.manage-btn { font-size: 15px; color: var(--blue); font-weight: 500; }
	.custom-card-list { display: flex; flex-direction: column; gap: 8px; }
	.custom-card-item {
		display: flex; align-items: center; gap: 12px;
		padding: 10px 12px;
		background: var(--card2);
		border-radius: 10px;
		&.empty { justify-content: center; color: var(--blue); }
	}
	.cc-icon {
		width: 32px; height: 32px; border-radius: 8px;
		display: flex; align-items: center; justify-content: center;
		i { color: #fff; font-size: 14px; }
	}
	.cc-name { font-size: 15px; color: var(--label); font-weight: 500; flex: 1; }
	.cc-count { font-size: 13px; color: var(--secondary); }

	.footer { text-align: center; padding: 24px 0; font-size: 12px; color: var(--secondary); }
</style>
