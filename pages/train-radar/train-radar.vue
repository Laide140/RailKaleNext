<template>
	<view class="page">
		<web-view :src="mapUrl"></web-view>
	</view>
</template>

<script>
import { getApiBase } from '@/service/api.js'
import { getKey } from '@/common/keys.js'
export default {
	data() { return { mapUrl: '', _timer: null } },
	onLoad() {
		// #ifdef H5
		var key = getKey('amap_js')
		var sec = getKey('amap_sec')
		var geo = encodeURIComponent(getApiBase('getTrainTimeTable/railway/index.php') + '/getTrainTimeTable/railway')
		var mapPath = new URL('static/railway-map.html', document.baseURI).href
		this.mapUrl = mapPath + '?rail=1&key=' + encodeURIComponent(key) + '&sec=' + encodeURIComponent(sec) + '&geo=' + geo
		// #endif
		// #ifdef APP-PLUS
		var appKey = getKey('amap_js')
		var appSec = getKey('amap_sec')
		var appGeo = encodeURIComponent(getApiBase('getTrainTimeTable/railway/index.php') + '/getTrainTimeTable/railway')
		this.mapUrl = '/static/railway-map.html?app=1&rail=1&key=' + encodeURIComponent(appKey) + '&sec=' + encodeURIComponent(appSec) + '&geo=' + appGeo
		// #endif
		this.start()
	},
	methods: {
		async start() {
			await this.waitWV()
			this.loadCache()
			this.pollStations()
		},

		waitWV() {
			return new Promise(function(r) {
				function c() {
					try { var p=getCurrentPages(),w=p[p.length-1].$getAppWebview().children()[0]; if(w&&w.evalJS){r();return} }catch(e){}
					setTimeout(c,300)
				}
				c()
			})
		},

		wv() {
			try { var p=getCurrentPages(); return p[p.length-1].$getAppWebview().children()[0] }catch(e){return null}
		},

		loadCache() {
			var names = ['110000','120000','130000','140000','150000','210000','220000','230000',
				'310000','320000','330000','340000','350000','360000','370000',
				'410000','420000','430000','440000','450000','460000','500000',
				'510000','520000','530000','540000','610000','620000','630000',
				'640000','650000','810000','820000']
			var count = 0
			for (var i = 0; i < names.length; i++) {
				try {
					var d = uni.getStorageSync('cache_' + names[i])
					if (d && d.features && d.features.length) {
						count++
						var w = this.wv()
						if (w) w.evalJS('addFeatures(' + JSON.stringify(d.features) + ')')
					}
				} catch(e) {}
			}
			console.log('[雷达] 缓存 ' + count + '/' + names.length + ' 个')
			if (!count) { console.log('[雷达] 无缓存，开始下载'); this.downloadAll() }
		},

		async downloadAll() {
			var base = getApiBase('getTrainTimeTable/railway/index.php') + '/getTrainTimeTable/railway/'
			var names = ['110000','120000','130000','140000','150000','210000','220000','230000',
				'310000','320000','330000','340000','350000','360000','370000',
				'410000','420000','430000','440000','450000','460000','500000',
				'510000','520000','530000','540000','610000','620000','630000',
				'640000','650000','810000','820000']
			for (var i = 0; i < names.length; i++) {
				try {
					var r = await this.req(base + names[i] + '.geojson')
					if (r && r.features && r.features.length) {
						var w = this.wv()
						if (w) w.evalJS('addFeatures(' + JSON.stringify(r.features) + ')')
						try { uni.setStorageSync('cache_' + names[i], {name:names[i], features:r.features}) } catch(e) {}
					}
				} catch(e) {}
			}
			console.log('[雷达] 下载完成')
		},

		checkEmuReq(w) {
			try {
				var t = w.getTitle ? w.getTitle() : ''
				if (t && t.indexOf('EMU_REQ:') === 0) {
					var train = t.substring(8)
					var self = this
					uni.request({
						url: 'https://api.rail.re/train/' + encodeURIComponent(train),
						responseType: 'text',
						timeout: 10000,
						success: function(r) {
							try {
								var arr = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
								if (Array.isArray(arr) && arr.length) {
									var d = new Date()
									var ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
									var f = arr.find(function(x){return x.date && x.date.indexOf(ds)===0})
									var emu = (f && f.emu_no) || arr[0].emu_no
									if (emu) self.wv().evalJS('document.getElementById("trainInfoEmu").textContent="' + emu + '"')
								}
							} catch(e) {}
						}
					})
				}
			} catch(e) {}
		},

		pollStations() {
			var self = this
			setInterval(function() {
				var w = self.wv()
				if (!w) return
				try {
					var title = w.getTitle ? w.getTitle() : ''
					if (!title || title.indexOf('STA:') !== 0) return
					var stations = title.substring(4).split('|').filter(function(s) { return s })
					if (!stations.length) return
					console.log('[雷达] 车站: ' + stations.join(', '))
					self.queryTrains(stations)
				} catch(e) {}
			}, 3000)
		},

		async queryTrains(stations) {
			// 构造 station=站1&station=站2&... 参数
			var params = stations.map(function(s) { return 'station=' + encodeURIComponent(s) }).join('&')
			var url = getApiBase('getLineTrains') + '/getLineTrains/?' + params
			console.log('[雷达] 请求: ' + url.substring(0, 120))
			try {
				var r = await this.req(url)
				console.log('[雷达] 返回 code=' + (r ? r.code : 'null'))
				if (r && r.code === '0' && r.trains && r.trains.length) {
					console.log('[雷达] 车次: ' + r.trains.length)
					this.locateTrains(r.trains)
				}
			} catch(e) { console.log('[雷达] 请求失败: ' + e.message) }
		},

		async locateTrains(trains) {
			var w = this.wv()
			if (!w) return
			var markers = []
			for (var i = 0; i < trains.length; i += 20) {
				var batch = trains.slice(i, i + 20)
				var results = await Promise.all(batch.map(function(num) {
					return this.req(getApiBase('getTrainLocate/index.php') + '/getTrainLocate/index.php?train=' + encodeURIComponent(num)).then(function(d) {
						if (d && d.code === 0 && d.data && d.data.position) return d.data
						return null
					}).catch(function(){return null})
				}.bind(this)))
				for (var j = 0; j < results.length; j++) {
					if (results[j]) markers.push(results[j])
				}
			}
			// 查前5辆的车组号
			var emuBatch = markers.slice(0, 5)
			await Promise.all(emuBatch.map(function(m) {
				return this.req('https://api.rail.re/train/' + encodeURIComponent(m.train), 10000).then(function(arr) {
					if (Array.isArray(arr) && arr.length) {
						var t = new Date()
						var ds = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')
						var f = arr.find(function(x){return x.date && x.date.indexOf(ds)===0})
						if (f && f.emu_no) m.emu_no = f.emu_no
						else if (arr[0].emu_no) m.emu_no = arr[0].emu_no
					}
				}).catch(function(){})
			}.bind(this)))
			console.log('[雷达] 定位 ' + markers.length + ' 辆')
			if (markers.length) {
				w.evalJS('clearTrainMarkers()')
				for (var k = 0; k < markers.length; k++) w.evalJS('addTrainMarker(' + JSON.stringify(markers[k]) + ')')
			}
		},

		req(url, timeout) {
			if (!timeout) timeout = 30000
			return new Promise(function(r, e) {
				uni.request({url:url,responseType:'text',timeout:timeout,
					success:function(x){try{r(typeof x.data==='string'?JSON.parse(x.data):x.data)}catch(err){e(err)}},
					fail:function(x){e(x)}})
			})
		}
	}
}
</script>

<style lang="scss">
.page{width:100%;height:100vh;overflow:hidden}
web-view{width:100%;height:100%}
</style>
