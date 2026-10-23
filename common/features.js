/**
 * 功能数据集中定义
 * 首页宫格 / 自定义卡片托盘 / 分区详情页 统一从这里取数据
 */

export const FEATURES = [
	{ id: 'train-query', icon: 'fa-train', label: '车次查询', path: 'train-query', group: 'travel' },
	{ id: 'timetable', icon: 'fa-calendar-alt', label: '时刻表', path: 'timetable', group: 'travel' },
	{ id: 'train-locate', icon: 'fa-map-marker-alt', label: '实时位置', path: 'train-locate', group: 'travel' },
	{ id: 'train-radar', icon: 'fa-satellite-dish', label: '列车雷达', path: 'train-radar', group: 'travel' },
	{ id: 'speed-test', icon: 'fa-gauge-high', label: '定位测速', path: 'speed-test', group: 'travel' },

	{ id: 'station-screen', icon: 'fa-desktop', label: '车站大屏', path: 'station-screen', group: 'station' },
	{ id: 'ticket-gate', icon: 'fa-ticket-alt', label: '检票口', path: 'ticket-gate', group: 'station' },
	{ id: 'traffic-query', icon: 'fa-bus', label: '交通查询', path: 'traffic-query', group: 'station' },
	{ id: 'station-code', icon: 'fa-building', label: '车站代码', path: 'station-code', group: 'station' },
	{ id: 'station-area', icon: 'fa-stairs', label: '站台规模', path: 'station-area', group: 'station' },
	{ id: 'sale-time', icon: 'fa-clock', label: '开售时间', path: 'sale-time', group: 'station' },

	{ id: 'emu-query', icon: 'fa-subway', label: '运用担当', path: 'emu-query', group: 'tools' },
	{ id: 'route-planner', icon: 'fa-route', label: '算路器', path: 'route-planner', group: 'tools' },
	{ id: 'rail-network-map', icon: 'fa-map', label: '路网地图', path: 'rail-network-map', group: 'tools' },
	{ id: 'souvenir-ticket', icon: 'fa-print', label: '纪念车票', path: 'souvenir-ticket', group: 'tools' },
	{ id: 'train-broadcast', icon: 'fa-bullhorn', label: '列车广播', path: 'train-broadcast', group: 'tools' },
	{ id: 'big-data', icon: 'fa-chart-simple', label: '铁路大数据', path: 'big-data', group: 'tools' },
	{ id: 'operation-share', icon: 'fa-camera-retro', label: '运转分享', path: 'operation-share', group: 'tools' },
]

export const SECTIONS = [
	{
		id: 'travel',
		title: '出行服务',
		subtitle: '查询列车车次、时刻表与实时运行位置',
		icon: 'fa-train',
		features: ['train-query', 'timetable', 'train-locate', 'train-radar', 'speed-test'],
	},
	{
		id: 'station',
		title: '车站服务',
		subtitle: '车站信息、检票口查询及交通接驳指南',
		icon: 'fa-building',
		features: ['station-screen', 'ticket-gate', 'traffic-query', 'station-code', 'station-area', 'sale-time'],
	},
	{
		id: 'tools',
		title: '实用工具',
		subtitle: '车组担当、路网地图与趣味辅助工具',
		icon: 'fa-comment-dots',
		features: ['emu-query', 'route-planner', 'rail-network-map', 'souvenir-ticket', 'train-broadcast', 'big-data', 'operation-share'],
	},
]

/**
 * 按 id 取功能
 */
export function getFeature(id) {
	return FEATURES.find(f => f.id === id)
}

/**
 * 由功能 id 列表解析出完整功能对象
 */
export function getFeaturesByIds(ids) {
	return (ids || [])
		.map(id => getFeature(id))
		.filter(Boolean)
}
