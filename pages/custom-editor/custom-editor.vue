<template>
	<view class="editor">
		<!-- 卡片列表（drop zone） -->
		<view class="cards-area">
			<view
				class="card-zone"
				v-for="(card, ci) in cards"
				:key="card.id"
				:class="{ highlight: dragging && dragOverCard === ci }"
				:style="cardBgStyle(card)"
			>
				<view class="cz-top">
					<input class="cz-title" v-model="card.title" placeholder="卡片标题" />
					<view class="cz-actions">
						<text class="cz-action" @tap="pickBg(ci)"><i class="fas fa-image"></i></text>
						<text class="cz-action" @tap="renameCard(ci)"><i class="fas fa-pen"></i></text>
						<text class="cz-action danger" @tap="deleteCard(ci)"><i class="fas fa-trash"></i></text>
					</view>
				</view>

				<!-- 功能 chips -->
				<view class="cz-features">
					<view class="cz-feature" v-for="(fid, fi) in card.features" :key="fid" @tap="removeFeature(ci, fi)">
						<i class="fas" :class="featureIcon(fid)"></i>
						<text>{{ featureLabel(fid) }}</text>
						<i class="fas fa-times cz-feature-x"></i>
					</view>
					<view class="cz-feature add-hint" v-if="!card.features.length">
						<text>拖拽下方图标到此，或点按图标添加</text>
					</view>
				</view>

				<!-- 卡片主题色 -->
				<view class="cz-colors">
					<text class="cz-colors-label">主题色</text>
					<view class="cz-color-dot" v-for="c in cardColors" :key="c" :style="{ backgroundColor: c }" :class="{ on: card.color === c }" @tap="card.color = c"></view>
					<view class="cz-remove-bg" v-if="card.bgImage" @tap="card.bgImage = ''"><i class="fas fa-eraser"></i> 移除背景图</view>
				</view>
			</view>

			<view class="add-card-btn" @tap="addCard">
				<i class="fas fa-plus"></i>
				<text>添加卡片</text>
			</view>
		</view>

		<!-- 功能托盘（固定底部，可拖拽） -->
		<view class="tray">
			<text class="tray-title">拖拽功能到卡片</text>
			<view class="tray-icons">
				<view
					class="tray-icon"
					v-for="(f, i) in allFeatures"
					:key="f.id"
					@touchstart="onDragStart($event, f)"
					@touchmove="onDragMove($event)"
					@touchend="onDragEnd($event)"
					@tap="tapAddFeature(f)"
				>
					<view class="tray-icon-badge" :style="{ backgroundColor: f.color }">
						<i class="fas" :class="f.icon"></i>
					</view>
					<text class="tray-icon-label">{{ f.label }}</text>
				</view>
			</view>
		</view>

		<!-- 拖拽 ghost -->
		<view class="drag-ghost" v-if="dragging" :style="{ left: ghostX + 'px', top: ghostY + 'px' }">
			<i class="fas" :class="draggingFeature && draggingFeature.icon"></i>
			<text>{{ draggingFeature && draggingFeature.label }}</text>
		</view>

		<!-- 底部留白（托盘高度） -->
		<view class="tray-spacer"></view>

		<!-- 保存 -->
		<view class="save-bar">
			<button class="save-btn" @tap="save">保存布局</button>
		</view>
	</view>
</template>

<script>
	import { FEATURES, getFeature } from '@/common/features.js'
	import { genId } from '@/common/settings.js'

	export default {
		data() {
			return {
				allFeatures: FEATURES,
				cards: [],
				cardColors: ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6'],
				dragging: false,
				draggingFeature: null,
				ghostX: 0,
				ghostY: 0,
				dragOverCard: -1,
				_cardRects: [],
			}
		},
		onLoad() {
			const saved = (this.$store.state.settings.customCards || []).map(c => ({
				...c,
				features: [...(c.features || [])]
			}))
			this.cards = saved.length ? saved : []
		},
		methods: {
			featureIcon(id) {
				const f = getFeature(id)
				return f ? f.icon : 'fa-question'
			},
			featureLabel(id) {
				const f = getFeature(id)
				return f ? f.label : id
			},
			cardBgStyle(card) {
				if (card.bgImage) {
					return { backgroundImage: `url(${card.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
				}
				return { backgroundColor: card.color }
			},
			addCard() {
				this.cards.push({
					id: genId('card'),
					title: '新卡片',
					color: '#007aff',
					bgImage: '',
					features: []
				})
			},
			deleteCard(ci) {
				uni.showModal({
					title: '删除卡片',
					content: `确定删除「${this.cards[ci].title || '未命名'}」吗？`,
					success: (res) => {
						if (res.confirm) this.cards.splice(ci, 1)
					}
				})
			},
			renameCard(ci) {
				const card = this.cards[ci]
				uni.showModal({
					title: '重命名卡片',
					editable: true,
					placeholderText: '卡片名称',
					content: card.title,
					success: (res) => {
						if (res.confirm && res.content) card.title = res.content
					}
				})
			},
			pickBg(ci) {
				const self = this
				uni.chooseImage({
					count: 1,
					success: (res) => {
						const tempPath = res.tempFilePaths[0]
						// app 平台保存为永久文件，避免重启失效
						if (typeof uni.saveFile === 'function') {
							uni.saveFile({
								tempFilePath: tempPath,
								success: (saveRes) => {
									self.cards[ci].bgImage = saveRes.savedFilePath
								},
								fail: () => {
									self.cards[ci].bgImage = tempPath
								}
							})
						} else {
							self.cards[ci].bgImage = tempPath
						}
					}
				})
			},
			removeFeature(ci, fi) {
				this.cards[ci].features.splice(fi, 1)
			},
			// ===== 拖拽 =====
			onDragStart(e, f) {
				this.dragging = true
				this.draggingFeature = f
				this.updateGhost(e)
				this._refreshCardRects()
			},
			onDragMove(e) {
				if (!this.dragging) return
				this.updateGhost(e)
				this._hitTest()
			},
			onDragEnd(e) {
				if (!this.dragging) return
				this.updateGhost(e)
				const idx = this._hitTest()
				if (idx >= 0) {
					this._addFeatureToCard(idx, this.draggingFeature)
				}
				this.dragging = false
				this.draggingFeature = null
				this.dragOverCard = -1
			},
			updateGhost(e) {
				const t = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0]
				if (!t) return
				this.ghostX = t.clientX
				this.ghostY = t.clientY
			},
			_refreshCardRects() {
				const self = this
				this._cardRects = []
				const query = uni.createSelectorQuery().in(this)
				query.selectAll('.card-zone').boundingClientRect(rects => {
					self._cardRects = rects || []
				}).exec()
			},
			_hitTest() {
				const x = this.ghostX
				const y = this.ghostY
				let found = -1
				for (let i = 0; i < this._cardRects.length; i++) {
					const r = this._cardRects[i]
					if (!r) continue
					if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
						found = i
						break
					}
				}
				this.dragOverCard = found
				return found
			},
			_addFeatureToCard(ci, f) {
				const card = this.cards[ci]
				if (!card) return
				if (card.features.includes(f.id)) {
					uni.showToast({ title: '该功能已存在', icon: 'none' })
					return
				}
				card.features.push(f.id)
				uni.showToast({ title: `已添加到「${card.title || '卡片'}」`, icon: 'none' })
			},
			// 兜底：点按添加
			tapAddFeature(f) {
				if (this.dragging) return
				if (!this.cards.length) {
					uni.showToast({ title: '请先添加卡片', icon: 'none' })
					return
				}
				const self = this
				const items = this.cards.map((c, i) => ({ text: `${c.title || '卡片'}（${c.features.length}项）`, index: i }))
				uni.showActionSheet({
					itemList: items.map(i => i.text),
					success: (res) => {
						const card = self.cards[items[res.tapIndex].index]
						if (card.features.includes(f.id)) {
							uni.showToast({ title: '该功能已存在', icon: 'none' })
							return
						}
						card.features.push(f.id)
					}
				})
			},
			save() {
				const clean = this.cards.map(c => ({
					id: c.id,
					title: c.title || '未命名',
					color: c.color,
					bgImage: c.bgImage || '',
					features: c.features
				}))
				this.$store.commit('setSettings', { customCards: clean })
				this.$store.commit('setSettings', { homeLayout: 'custom' })
				uni.showToast({ title: '布局已保存', icon: 'success' })
				setTimeout(() => uni.navigateBack(), 500)
			}
		}
	}
</script>

<style lang="scss">
	.editor {
		min-height: 100vh;
		background: #f2f2f7;
		padding: 16px;
		box-sizing: border-box;
	}

	/* ===== Cards ===== */
	.cards-area { padding-bottom: 12px; }
	.card-zone {
		border-radius: 16px;
		padding: 14px;
		margin-bottom: 12px;
		box-shadow: 0 2px 12px rgba(0,0,0,0.08);
		transition: box-shadow 0.2s, transform 0.2s;
		&.highlight {
			box-shadow: 0 0 0 3px var(--blue), 0 4px 16px rgba(0,0,0,0.15);
			transform: scale(1.01);
		}
	}
	.cz-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
	.cz-title {
		flex: 1;
		font-size: 18px;
		font-weight: 700;
		color: #fff;
		background: transparent;
		border: none;
		outline: none;
		text-shadow: 0 1px 4px rgba(0,0,0,0.3);
	}
	.cz-actions { display: flex; gap: 8px; }
	.cz-action {
		width: 30px; height: 30px;
		border-radius: 8px;
		background: rgba(0,0,0,0.25);
		display: flex; align-items: center; justify-content: center;
		color: #fff;
		font-size: 13px;
		&.danger { background: rgba(255,59,48,0.7); }
	}

	.cz-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
	.cz-feature {
		display: inline-flex; align-items: center; gap: 5px;
		padding: 5px 10px;
		background: rgba(255,255,255,0.9);
		border-radius: 8px;
		font-size: 13px;
		color: #1c1c1e;
		font-weight: 500;
		i:first-child { color: var(--blue); font-size: 12px; }
		.cz-feature-x { font-size: 10px; color: #c6c6c8; margin-left: 2px; }
	}
	.cz-feature.add-hint {
		background: rgba(255,255,255,0.25);
		color: rgba(255,255,255,0.9);
		border: 1px dashed rgba(255,255,255,0.5);
		padding: 8px 12px;
	}

	.cz-colors { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.cz-colors-label { font-size: 12px; color: rgba(255,255,255,0.85); }
	.cz-color-dot {
		width: 20px; height: 20px;
		border-radius: 50%;
		border: 2px solid rgba(255,255,255,0.6);
		&.on { border: 2px solid #fff; box-shadow: 0 0 0 2px var(--blue); }
	}
	.cz-remove-bg {
		font-size: 12px;
		color: rgba(255,255,255,0.9);
		background: rgba(0,0,0,0.25);
		padding: 4px 10px;
		border-radius: 8px;
	}

	.add-card-btn {
		display: flex; align-items: center; justify-content: center; gap: 8px;
		border: 2px dashed #c6c6c8;
		border-radius: 16px;
		padding: 16px;
		color: #8e8e93;
		font-size: 15px;
		font-weight: 500;
		background: rgba(255,255,255,0.5);
	}

	/* ===== Tray ===== */
	.tray {
		position: fixed;
		left: 0; right: 0; bottom: 70px;
		background: rgba(255,255,255,0.92);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-top: 0.5px solid rgba(60,60,67,0.08);
		padding: 10px 16px 14px;
		z-index: 500;
	}
	.tray-title { font-size: 12px; color: #8e8e93; font-weight: 600; margin-bottom: 8px; display: block; }
	.tray-icons {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		max-height: 132px;
		overflow-y: auto;
	}
	.tray-icon {
		width: 58px;
		display: flex; flex-direction: column; align-items: center; gap: 4px;
		touch-action: none;
	}
	.tray-icon-badge {
		width: 40px; height: 40px;
		border-radius: 11px;
		display: flex; align-items: center; justify-content: center;
		i { color: #fff; font-size: 18px; }
	}
	.tray-icon-label { font-size: 11px; color: #1c1c1e; }

	/* ===== Drag Ghost ===== */
	.drag-ghost {
		position: fixed;
		z-index: 9999;
		transform: translate(-50%, -50%);
		width: 84px;
		padding: 8px;
		background: rgba(0,0,0,0.75);
		border-radius: 10px;
		display: flex; flex-direction: column; align-items: center; gap: 4px;
		pointer-events: none;
		i { color: #fff; font-size: 18px; }
		text { color: #fff; font-size: 11px; }
	}

	.tray-spacer { height: 250px; }

	/* ===== Save ===== */
	.save-bar {
		position: fixed;
		left: 0; right: 0; bottom: 0;
		background: rgba(255,255,255,0.9);
		backdrop-filter: blur(20px);
		padding: 10px 16px;
		padding-bottom: calc(10px + env(safe-area-inset-bottom, 0));
		z-index: 500;
	}
	.save-btn {
		width: 100%;
		background: var(--blue);
		color: #fff;
		font-size: 17px;
		font-weight: 600;
		border-radius: 12px;
		height: 48px;
		line-height: 48px;
		border: none;
		margin: 0;
	}
</style>
