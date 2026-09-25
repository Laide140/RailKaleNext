/**
 * 功能数据集中定义
 * 首页宫格 / 自定义卡片托盘 / 分区详情页 统一从这里取数据
 */

export const FEATURES = [
	{ id: 'train-query', icon: 'fa-train', label: '车次查询', path: 'train-query', color: '#007aff', group: 'travel' },
	{ id: 'timetable', icon: 'fa-calendar-alt', label: '时刻表', path: 'timetable', color: '#34c759', group: 'travel' },
	{ id: 'train-locate', icon: 'fa-map-marker-alt', label: '实时位置', path: 'train-locate', color: '#ff2d55', group: 'travel' },
	{ id: 'train-radar', icon: 'fa-satellite-dish', label: '列车雷达', path: 'train-radar', color: '#34c759', group: 'travel' },
	{ id: 'speed-test', icon: 'fa-gauge-high', label: '定位测速', path: 'speed-test', color: '#ff9500', group: 'travel' },

	{ id: 'station-screen', icon: 'fa-desktop', label: '车站大屏', path: 'station-screen', color: '#5856d6', group: 'station' },
	{ id: 'ticket-gate', icon: 'fa-ticket-alt', label: '检票口', path: 'ticket-gate', color: '#ff3b30', group: 'station' },
	{ id: 'traffic-query', icon: 'fa-bus', label: '交通查询', path: 'traffic-query', color: '#5ac8fa', group: 'station' },
	{ id: 'station-code', icon: 'fa-building', label: '车站代码', path: 'station-code', color: '#34c759', group: 'station' },
	{ id: 'station-area', icon: 'fa-stairs', label: '站台规模', path: 'station-area', color: '#5856d6', group: 'station' },

	{ id: 'emu-query', icon: 'fa-subway', label: '运用担当', path: 'emu-query', color: '#af52de', group: 'tools' },
	{ id: 'rail-network-map', icon: 'fa-map', label: '路网地图', path: 'rail-network-map', color: '#ff9500', group: 'tools' },
	{ id: 'souvenir-ticket', icon: 'fa-print', label: '纪念车票', path: 'souvenir-ticket', color: '#ff9500', group: 'tools' },
	{ id: 'train-broadcast', icon: 'fa-bullhorn', label: '列车广播', path: 'train-broadcast', color: '#007aff', group: 'tools' },
]

export const SECTIONS = [
	{
		id: 'travel',
		title: '出行服务',
		subtitle: '查询列车车次、时刻表与实时运行位置',
		icon: 'fa-train',
		badgeColor: '#007aff',
		bgImage: '../../static/section-travel.jpg',
		features: ['train-query', 'timetable', 'train-locate', 'train-radar', 'speed-test'],
	},
	{
		id: 'station',
		title: '车站服务',
		subtitle: '车站信息、检票口查询及交通接驳指南',
		icon: 'fa-building',
		badgeColor: '#5856d6',
		bgImage: '../../static/section-station.jpg',
		features: ['station-screen', 'ticket-gate', 'traffic-query', 'station-code', 'station-area'],
	},
	{
		id: 'tools',
		title: '实用工具',
		subtitle: '车组担当、路网地图与趣味辅助工具',
		icon: 'fa-comment-dots',
		badgeColor: '#af52de',
		bgImage: '../../static/section-tracking.jpg',
		features: ['emu-query', 'rail-network-map', 'souvenir-ticket', 'train-broadcast'],
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
