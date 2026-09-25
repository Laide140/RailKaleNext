<template>
	<view class="page">
		<web-view :src="mapUrl"></web-view>
		<view class="loading-badge" v-if="loadingText">
			<text class="badge-province">{{ loadingText }}</text>
		</view>
	</view>
</template>

<script>
import { getKey } from '@/common/keys.js'
import { getApiBase } from '@/service/api.js'

// GeoJSON 目录跟随 API 源设置
function geoBase() {
	return getApiBase('getTrainTimeTable/railway/index.php') + '/getTrainTimeTable/railway/'
}
var FILE_LIST = [
	'110000.geojson','120000.geojson','130000.geojson','140000.geojson','150000.geojson',
	'210000.geojson','220000.geojson','230000.geojson','310000.geojson','320000.geojson',
	'330000.geojson','340000.geojson','350000.geojson','360000.geojson','370000.geojson',
	'410000.geojson','420000.geojson','430000.geojson','440000.geojson','450000.geojson',
	'460000.geojson','500000.geojson','510000.geojson','520000.geojson','530000.geojson',
	'540000.geojson','610000.geojson','620000.geojson','630000.geojson','640000.geojson',
	'650000.geojson','810000.geojson','820000.geojson'
]
var PROVINCE_MAP = {
	'110000':'北京','120000':'天津','130000':'河北','140000':'山西','150000':'内蒙古',
	'210000':'辽宁','220000':'吉林','230000':'黑龙江',
	'310000':'上海','320000':'江苏','330000':'浙江','340000':'安徽','350000':'福建','360000':'江西','370000':'山东',
	'410000':'河南','420000':'湖北','430000':'湖南','440000':'广东','450000':'广西','460000':'海南',
	'500000':'重庆','510000':'四川','520000':'贵州','530000':'云南','540000':'西藏',
	'610000':'陕西','620000':'甘肃','630000':'青海','640000':'宁夏','650000':'新疆',
	'810000':'香港','820000':'澳门'
}
function provinceName(fn) { return PROVINCE_MAP[fn.substring(0,6)] || fn.substring(0,2) }

function loadJSON(url) {
	return new Promise(function(resolve, reject) {
		uni.request({
			url: url, responseType: 'text', timeout: 30000,
			success: function(r) {
				try {
					resolve(typeof r.data === 'string' ? JSON.parse(r.data) : r.data)
				} catch (e) {
					// 非 JSON 响应（如错误页）时 reject，避免 Promise 悬挂导致下载流程卡死
					reject(new Error('响应不是合法 JSON'))
				}
			},
			fail: reject
		})
	})
}

function readCache() {
	return new Promise(function(resolve) {
		var results = []
		for (var i = 0; i < FILE_LIST.length; i++) {
			var name = FILE_LIST[i].replace('.geojson', '')
			try {
				var d = uni.getStorageSync('cache_' + name)
				if (d && d.name && d.features) { results.push(d); console.log('[路网] 读缓存: ' + name + ' OK ' + d.features.length + ' 条') }
			} catch(e) { console.log('[路网] 读缓存: ' + name + ' 不存在') }
		}
		console.log('[路网] 读缓存: 完成, 共 ' + results.length + ' 个文件')
		var cachedMB = 0; try { cachedMB = Math.round((uni.getStorageInfoSync().currentSize || 0) / 1024 * 10) / 10 } catch(e) {}; resolve({files: results, cachedMB: cachedMB})
	})
}

function saveOneFile(name, features) {
	return new Promise(function(resolve) {
		console.log('[路网] 存缓存: ' + name + ' ' + features.length + ' 条')
		try {
			uni.setStorageSync('cache_' + name, {name: name, features: features})
			console.log('[路网] 存缓存: ' + name + ' 成功')
		} catch(e) {
			console.log('[路网] 存缓存: ' + name + ' 失败: ' + e.message)
		}
		resolve()
	})
}
export default {
	data() { return { mapUrl: '', loadingText: '' } },
	onLoad() {
		const key = getKey('amap_js')
		const sec = getKey('amap_sec')
		const geo = encodeURIComponent(geoBase())
		// #ifdef H5
		// Resolve through the app base URL so deployments under a sub-path do not hit the origin root.
		var mapPath = new URL('static/railway-map.html', document.baseURI).href
		this.mapUrl = mapPath + '?key=' + encodeURIComponent(key) + '&sec=' + encodeURIComponent(sec) + '&geo=' + geo
		// #endif
		// #ifdef APP-PLUS
		this.mapUrl = '/static/railway-map.html?app=1&key=' + encodeURIComponent(key) + '&sec=' + encodeURIComponent(sec) + '&geo=' + geo
		this.start()
		// #endif
	},
	methods: {
		async start() {
			console.log('[路网] start: 等待webview...')
			await this.waitWebView()
			console.log('[路网] start: webview就绪')

			console.log('[路网] start: 读取缓存...')
			var cached = await readCache()
			if (cached && cached.files && cached.files.length) {
				if (cached.files.length >= FILE_LIST.length) {
					console.log('[路网] 缓存完整 ' + cached.files.length + ' 个文件')
					for (var i = 0; i < cached.files.length; i++) {
						var f = cached.files[i]
						this.loadingText = '正在加载' + provinceName(f.name) + '（' + (i+1) + '/' + cached.files.length + '）'
						this.inject(f.features)
					}
					console.log('[路网] 注入完成')
					this.loadingText = ''
					return
				}
				// 部分缓存
				var missCount = FILE_LIST.length - cached.files.length
				var missMB = Math.round((169 - cached.cachedMB) * 10) / 10
				console.log('[路网] 部分缓存 ' + cached.files.length + '/' + FILE_LIST.length + ', 缺 ' + missCount + ' 个约 ' + missMB + 'MB')
				var netType = await this.getNetworkType()
				if (netType !== 'wifi' && netType !== 'ethernet') {
					var ok = await this.confirm('已缓存' + cached.cachedMB.toFixed(1) + 'MB，还需下载约' + missMB + 'MB，将使用移动数据，确定吗？')
					if (!ok) { this.loadingText = ''; return }
				}
				// 只下载缺失的
				for (var i = 0; i < FILE_LIST.length; i++) {
					var fn = FILE_LIST[i]
					var name = fn.replace('.geojson', '')
					// 检查是否已缓存
					var already = false
					for (var j = 0; j < cached.files.length; j++) {
						if (cached.files[j].name === name) { already = true; break }
					}
					if (already) continue
					this.loadingText = '正在下载' + provinceName(fn) + '（' + (i+1) + '/' + FILE_LIST.length + '）'
					try {
						var gj = await loadJSON(geoBase() + '/' + fn)
						if (gj && gj.features && gj.features.length) {
							this.inject(gj.features)
							await saveOneFile(fn.replace('.geojson',''), gj.features)
						}
					} catch(e) { console.warn('[路网] ' + fn + ' 失败: ' + (e.errMsg || e.message)) }
				}
				this.loadingText = ''
				return
			}
			console.log('[路网] 无缓存, 检查网络')

			var netType = await this.getNetworkType()
			console.log('[路网] 网络类型: ' + netType)
			if (netType !== 'wifi' && netType !== 'ethernet') {
				var ok = await this.confirm('路网数据共约169MB，将会使用您的移动数据流量，确定吗？')
				if (!ok) { console.log('[路网] 用户取消下载'); this.loadingText = ''; return }
			}

			console.log('[路网] 开始下载 ' + FILE_LIST.length + ' 个文件')
			for (var i = 0; i < FILE_LIST.length; i++) {
				var fn = FILE_LIST[i]
				this.loadingText = '正在下载' + provinceName(fn) + '（' + (i+1) + '/' + FILE_LIST.length + '）'
				console.log('[路网] 下载 ' + (i+1) + '/' + FILE_LIST.length + ' ' + fn)
				try {
					var gj = await loadJSON(geoBase() + '/' + fn)
					if (gj && gj.features && gj.features.length) {
						console.log('[路网] ' + fn + ' 下载成功 ' + gj.features.length + ' 条, 注入并缓存')
						this.inject(gj.features)
						await saveOneFile(fn.replace('.geojson',''), gj.features)
					} else {
						console.warn('[路网] ' + fn + ' 无features')
					}
				} catch(e) {
					console.warn('[路网] ' + fn + ' 失败: ' + (e.errMsg || e.message))
				}
			}
			console.log('[路网] 全部下载完毕')
			this.loadingText = ''
		},

		getNetworkType() {
			return new Promise(function(resolve) {
				uni.getNetworkType({ success: function(r) { resolve(r.networkType) }, fail: function() { resolve('unknown') } })
			})
		},

		confirm(msg) {
			return new Promise(function(resolve) {
				uni.showModal({ title: '提示', content: msg, success: function(r) { resolve(r.confirm) } })
			})
		},

		waitWebView() {
			return new Promise(function(resolve) {
				var tries = 0
				function check() {
					tries++
					try {
						var p = getCurrentPages()
						var wv = p[p.length - 1].$getAppWebview().children()[0]
						if (wv && wv.evalJS) { console.log('[路网] webview就绪, 尝试 ' + tries + ' 次'); resolve(); return }
					} catch(e) {}
					if (tries > 50) { console.warn('[路网] webview等待超时'); resolve() }
					else setTimeout(check, 300)
				}
				check()
			})
		},

		inject(features) {
			if (!features || !features.length) return
			var wv = null
			try {
				var p = getCurrentPages()
				wv = p[p.length - 1].$getAppWebview().children()[0]
			} catch(e) { console.warn('[路网] inject: 获取webview失败', e) }
			if (wv && wv.evalJS) {
				try { wv.evalJS('addFeatures(' + JSON.stringify(features) + ')'); return true } catch(e) { console.warn('[路网] evalJS异常:', e); return false }
			} else {
				console.warn('[路网] inject: webview不可用'); return false
			}
		}
	}
}
</script>

<style lang="scss">
	.page { width: 100%; height: 100vh; overflow: hidden; position: relative; }
	web-view { width: 100%; height: 100%; }
	.loading-badge {
		position: fixed; bottom: 140rpx; right: 24rpx;
		background: rgba(0,0,0,0.65); border-radius: 30rpx;
		padding: 12rpx 24rpx; z-index: 999;
		pointer-events: none; backdrop-filter: blur(4px);
	}
	.badge-province { font-size: 24rpx; color: #fff; white-space: nowrap; }
</style>
