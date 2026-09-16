<template>
	<view class="broadcast" :class="{ 'source-baidu': source === 'baidu' }">
		<!-- Header -->
		<view class="header">
			<view class="header-icon-wrap">
				<i class="fas fa-bullhorn header-icon"></i>
			</view>
			<text class="header-title">列车广播</text>
			<text class="header-subtitle">模拟车站及列车语音播报</text>
		</view>

		<!-- 音源选择 -->
		<view class="section">
			<text class="section-title">音源</text>
			<view class="segmented-control">
				<view class="seg-item" :class="{ active: source === 'xunfei' }" @click="source = 'xunfei'">
					<text>讯飞</text>
				</view>
				<view class="seg-item" :class="{ active: source === 'baidu' }" @click="source = 'baidu'">
					<text>百度</text>
				</view>
			</view>
		</view>

		<!-- 快捷广播语 -->
		<view class="section">
			<text class="section-title">快捷用语</text>
			<scroll-view class="pills-scroll" scroll-x show-scrollbar="false">
				<view class="pills-row">
					<view class="pill" v-for="(item, i) in presets" :key="i" @click="selectPreset(item)">
						<text>{{ item.label }}</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 输入区 -->
		<view class="input-card">
			<textarea
				class="broadcast-input"
				v-model="text"
				placeholder="输入广播内容…"
				:maxlength="500"
				auto-height
			/>
			<view class="input-footer">
				<text class="char-count">{{ text.length }}/500</text>
				<text class="clear-btn" v-if="text" @click="text = ''">清空</text>
			</view>
		</view>

		<!-- 播放状态 -->
		<view class="play-section">
			<button class="play-btn" :class="{ playing: isPlaying }" @tap="togglePlay" :disabled="!text.trim() || loading">
				<template v-if="loading">
					<i class="fas fa-spinner fa-pulse" style="font-size: 22px;"></i>
				</template>
				<template v-else-if="isPlaying">
					<i class="fas fa-stop" style="font-size: 22px;"></i>
				</template>
				<template v-else>
					<i class="fas fa-play" style="font-size: 22px; margin-left: 3px;"></i>
				</template>
			</button>

			<view class="play-status" v-if="statusText">
				<view class="status-dot" :class="{ active: isPlaying, error: isError }"></view>
				<text class="status-text" :class="{ error: isError }">{{ statusText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getTrainBroadcastUrl, getBaiduTtsUrl } from '@/service/api.js'

	const PRESETS = [
		{ label: '广铁U彩', text: '广铁U彩提示您，前方到站是：广州南站，请下车的乘客提前做好下车准备。' },
		{ label: '抢铁U彩', text: '叮咚，抢铁U彩吓死您，前方到站是：抢州南站。请下车的乘客配合我们抢钱。' },
		{ label: '十八号线', text: '本次列车终点站为，万顷沙。下一站，番禺广场。' },
	]

	export default {
		data() {
			return {
				presets: PRESETS,
				text: '',
				source: 'xunfei',
				isPlaying: false,
				loading: false,
				isError: false,
				statusText: '',
				audioContext: null,
			}
		},
		onUnload() {
			this.destroyAudio()
		},
		methods: {
			selectPreset(item) {
				this.text = item.text
				this.isError = false
			},
			async togglePlay() {
				if (this.isPlaying) {
					this.stopPlay()
					return
				}
				await this.startPlay()
			},
			async startPlay() {
				if (!this.text.trim()) return
				this.loading = true
				this.isError = false
				this.statusText = '请求中…'

				try {
					this.destroyAudio()

					const url = this.source === 'xunfei'
						? getTrainBroadcastUrl(this.text.trim())
						: getBaiduTtsUrl(this.text.trim())

					const tempPath = await new Promise((resolve, reject) => {
						uni.downloadFile({
							url: url,
							success: (res) => {
								if (res.statusCode === 200) resolve(res.tempFilePath)
								else reject(new Error('HTTP ' + res.statusCode))
							},
							fail: reject
						})
					})

					this.playFromFile(tempPath)
				} catch (err) {
					console.error('TTS请求失败', err)
					this.loading = false
					this.isError = true
					this.statusText = '请求失败'
				}
			},
			playFromFile(filePath) {
				const audio = uni.createInnerAudioContext()
				audio.src = filePath
				audio.autoplay = true
				try { audio.obeyMuteSwitch = false } catch (e) { /* 部分平台不支持，忽略 */ }

				audio.onPlay(() => {
					this.loading = false
					this.isPlaying = true
					this.isError = false
					this.statusText = '播放中'
				})

				audio.onEnded(() => {
					this.isPlaying = false
					this.isError = false
					this.statusText = '播放完毕'
					setTimeout(() => {
						if (!this.isPlaying && !this.isError) this.statusText = ''
					}, 2000)
				})

				audio.onError((e) => {
					console.error('TTS播放错误', JSON.stringify(e))
					this.loading = false
					this.isPlaying = false
					this.isError = true
					this.statusText = '播放失败'
				})

				audio.onStop(() => {
					this.isPlaying = false
				})

				this.audioContext = audio
			},
			stopPlay() {
				if (this.audioContext) {
					this.audioContext.stop()
					this.audioContext.destroy()
					this.audioContext = null
				}
				this.isPlaying = false
				this.loading = false
				this.isError = false
				this.statusText = '已停止'
				setTimeout(() => {
					if (!this.isPlaying) this.statusText = ''
				}, 1500)
			},
			destroyAudio() {
				if (this.audioContext) {
					this.audioContext.destroy()
					this.audioContext = null
				}
			}
		}
	}
</script>

<style lang="scss">
	.broadcast {
		padding: 0 20px 40px;
		background: #f2f2f7;
		min-height: 100vh;
	}

	/* ===== Header ===== */
	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 36px 0 24px;
	}

	.header-icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: 14px;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.header-icon { font-size: 24px; color: #fff; }

	.source-baidu .header-icon-wrap { background: #2932e1; }

	.header-title {
		font-size: 22px;
		font-weight: 700;
		color: #1c1c1e;
		margin-bottom: 3px;
	}
	.header-subtitle {
		font-size: 14px;
		color: #8e8e93;
	}

	/* ===== Section ===== */
	.section { margin-bottom: 20px; }
	.section-title {
		font-size: 13px;
		font-weight: 600;
		color: #8e8e93;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px;
		padding-left: 4px;
	}

	/* ===== Segmented Control ===== */
	.segmented-control {
		display: flex;
		background: rgba(120,120,128,0.12);
		border-radius: 9px;
		padding: 2px;
	}

	.seg-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 0;
		border-radius: 7px;
		font-size: 13px;
		font-weight: 600;
		color: #8e8e93;
		transition: all 0.25s;

		&.active {
			background: #fff;
			color: #007aff;
			box-shadow: 0 1px 3px rgba(0,0,0,0.08);
		}
	}

	.source-baidu .seg-item.active { color: #2932e1; }

	/* ===== Preset Pills ===== */
	.pills-scroll {
		overflow: hidden;
		white-space: nowrap;
		margin: 0 -4px;
	}
	.pills-row {
		display: inline-flex;
		gap: 8px;
		padding: 2px 4px;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		padding: 7px 14px;
		background: #e5e5ea;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 500;
		color: #1c1c1e;
		letter-spacing: 0.2px;
		line-height: 1.3;
		transition: opacity 0.15s;

		&:active { opacity: 0.5; }
	}

	/* ===== Input Card ===== */
	.input-card {
		background: #fff;
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 24px;
	}

	.broadcast-input {
		width: 100%;
		min-height: 120px;
		padding: 16px 16px 8px;
		font-size: 17px;
		color: #1c1c1e;
		line-height: 1.6;
		background: transparent;
		box-sizing: border-box;
		border: none;
		outline: none;
	}

	.input-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px 16px 10px;
	}

	.char-count { font-size: 12px; color: #c6c6c8; }
	.clear-btn { font-size: 15px; color: #007aff; font-weight: 500; }
	.source-baidu .clear-btn { color: #2932e1; }

	/* ===== Play Section ===== */
	.play-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.play-btn {
		width: 64px;
		height: 64px;
		border-radius: 32px;
		background: #007aff;
		color: #fff;
		font-size: 26px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: transform 0.2s, background 0.2s;
		box-shadow: none;

		&.playing {
			background: #ff3b30;
		}

		&:active {
			transform: scale(1.12);
		}

		&[disabled] {
			opacity: 0.3;
		}

		i { font-style: normal; }
	}

	.source-baidu .play-btn:not(.playing) { background: #2932e1; }

	.play-status {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 20px;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: transparent;

		&.active {
			background: #007aff;
			animation: dot-pulse 1s ease-in-out infinite;
		}
		&.error { background: #ff3b30; }
	}

	.source-baidu .status-dot.active { background: #2932e1; }

	@keyframes dot-pulse {
		0%, 100% { opacity: 1; }
		50%      { opacity: 0.3; }
	}

	.status-text {
		font-size: 14px;
		color: #007aff;
		font-weight: 500;

		&.error { color: #ff3b30; }
	}

	.source-baidu .status-text:not(.error) { color: #2932e1; }
</style>
