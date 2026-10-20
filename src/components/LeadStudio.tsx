import React, { useState, useMemo } from 'react';
import { LeadRecord, LeadType, PlatformType, ContentProject } from '../types';
import { api } from '../api';
import {
  DollarSign,
  Plus,
  TrendingUp,
  Tag,
  CheckCircle2,
  Clock,
  Briefcase,
  UserCheck,
  Award,
  AlertCircle,
  HelpCircle,
  Filter,
  Layers
} from 'lucide-react';

interface LeadStudioProps {
  leads: LeadRecord[];
  projects?: ContentProject[];
  onRefreshLeads: () => void;
}

const TYPE_CONFIG: Record<LeadType, { label: string; icon: any; color: string; badge: string }> = {
  commercial_order: {
    label: '商单合作',
    icon: Briefcase,
    color: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  consulting: {
    label: '付费咨询',
    icon: UserCheck,
    color: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  coaching: {
    label: '陪跑辅导',
    icon: Layers,
    color: 'text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  platform_incentive: {
    label: '平台激励',
    icon: Award,
    color: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
};

const STATUS_CONFIG: Record<LeadRecord['status'], { label: string; color: string }> = {
  inquiry: { label: '初步咨询', color: 'text-slate-500 bg-slate-100' },
  negotiating: { label: '洽谈跟进', color: 'text-blue-600 bg-blue-50' },
  confirmed: { label: '已签约/待交付', color: 'text-amber-600 bg-amber-50' },
  delivered: { label: '已交付/待打款', color: 'text-purple-600 bg-purple-50' },
  paid: { label: '已结算到账', color: 'text-emerald-700 bg-emerald-50 font-semibold' }
};

export const LeadStudio: React.FC<LeadStudioProps> = ({
  leads,
  projects = [],
  onRefreshLeads
}) => {
  const [filterType, setFilterType] = useState<LeadType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<LeadRecord['status'] | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    clientOrPlatform: '',
    type: 'commercial_order' as LeadType,
    amount: '',
    amountUnknown: true,
    status: 'inquiry' as LeadRecord['status'],
    platform: 'xiaohongshu' as PlatformType,
    relatedProjectId: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [leads, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    let totalSettled = 0;
    let pendingPipeline = 0;
    let unknownAmountCount = 0;

    leads.forEach(l => {
      if (l.status === 'paid' && l.amount !== null) {
        totalSettled += l.amount;
      } else if (l.status !== 'paid' && l.amount !== null) {
        pendingPipeline += l.amount;
      }
      if (l.amountUnknown || l.amount === null) {
        unknownAmountCount++;
      }
    });

    const commercialCount = leads.filter(l => l.type === 'commercial_order').length;
    const consultingCount = leads.filter(l => l.type === 'consulting').length;

    return { totalSettled, pendingPipeline, unknownAmountCount, commercialCount, consultingCount };
  }, [leads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.clientOrPlatform.trim()) {
      alert('请填写合作标题和客户/平台');
      return;
    }
    setSubmitting(true);
    try {
      await api.createLead({
        title: formData.title.trim(),
        clientOrPlatform: formData.clientOrPlatform.trim(),
        type: formData.type,
        amount: formData.amountUnknown ? null : (parseFloat(formData.amount) || null),
        amountUnknown: formData.amountUnknown,
        status: formData.status,
        platform: formData.platform,
        relatedProjectId: formData.relatedProjectId || undefined,
        notes: formData.notes.trim() || undefined
      });
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        clientOrPlatform: '',
        type: 'commercial_order',
        amount: '',
        amountUnknown: true,
        status: 'inquiry',
        platform: 'xiaohongshu',
        relatedProjectId: '',
        notes: ''
      });
      onRefreshLeads();
    } catch (err: any) {
      alert('创建线索失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: LeadRecord['status']) => {
    try {
      await api.updateLead(id, { status: newStatus });
      onRefreshLeads();
    } catch (err: any) {
      alert('更新状态失败: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-medium text-amber-600">
            <span>商业化</span>
            <span>·</span>
            <span>商单与咨询线索记录</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            商单与收益线索本
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            记录通过内容带来的真实商单、付费咨询、陪跑辅导与平台激励线索。
            未知收益独立标记为「待定」，绝不混算为零；纯本地记录，不会自动联系他人。
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>记录新线索</span>
        </button>
      </div>

      {/* KPI & Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500">已到账结算收益</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">
              ¥{stats.totalSettled.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">已实际交付并收款</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500">在跟洽谈总估值</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-bold text-slate-800 font-mono">
              ¥{stats.pendingPipeline.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">进行中已报价金额</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500">金额待定线索</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-bold text-amber-600 font-mono">
              {stats.unknownAmountCount}
            </span>
            <span className="text-xs text-slate-400">条</span>
          </div>
          <span className="text-[10px] text-slate-400">意向初步接触，待核定</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-medium text-slate-500">类型构成</span>
          <div className="flex items-center space-x-3 text-xs pt-0.5">
            <span className="text-amber-700 font-medium">商单 {stats.commercialCount}</span>
            <span className="text-blue-700 font-medium">咨询 {stats.consultingCount}</span>
          </div>
          <span className="text-[10px] text-slate-400">独立分类，不合并成长分</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            全部类型 ({leads.length})
          </button>
          <button
            onClick={() => setFilterType('commercial_order')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterType === 'commercial_order' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            商单合作
          </button>
          <button
            onClick={() => setFilterType('consulting')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterType === 'consulting' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            付费咨询
          </button>
          <button
            onClick={() => setFilterType('coaching')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterType === 'coaching' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            陪跑辅导
          </button>
          <button
            onClick={() => setFilterType('platform_incentive')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterType === 'platform_incentive' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            平台激励
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs bg-transparent border-0 font-medium text-slate-700 cursor-pointer focus:ring-0"
          >
            <option value="all">全流程阶段</option>
            <option value="inquiry">初步咨询</option>
            <option value="negotiating">洽谈跟进</option>
            <option value="confirmed">已签约/待交付</option>
            <option value="delivered">已交付/待打款</option>
            <option value="paid">已结算到账</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center space-y-2">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">暂无符合条件的线索记录</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            当有人在评论区、私信或推特互动中提出合作、咨询意向时，可点击上方「记录新线索」收录。
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredLeads.map((item) => {
            const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.commercial_order;
            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.inquiry;
            const TypeIcon = typeConf.icon;

            return (
              <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium border ${typeConf.badge}`}>
                      <TypeIcon className="w-3 h-3" />
                      <span>{typeConf.label}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                    {item.platform && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        来源: {item.platform.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>对接方: <strong className="text-slate-700">{item.clientOrPlatform}</strong></span>
                    {item.notes && <span className="text-slate-400 truncate max-w-md">备注: {item.notes}</span>}
                    <span className="text-[11px] text-slate-400">
                      创建时间: {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right side: Amount and stage updater */}
                <div className="flex items-center space-x-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">金额</div>
                    {item.amountUnknown || item.amount === null ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        待定 / 未知
                      </span>
                    ) : (
                      <span className="text-base font-bold text-slate-900 font-mono">
                        ¥{item.amount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Stage dropdown */}
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateStatus(item.id, e.target.value as any)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 shadow-2xs hover:border-slate-300 focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="inquiry">初步咨询</option>
                    <option value="negotiating">洽谈跟进</option>
                    <option value="confirmed">已签约/待交付</option>
                    <option value="delivered">已交付/待打款</option>
                    <option value="paid">已结算到账</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">记录商单 / 咨询线索</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  线索标题 / 合作项目 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 某品牌 AI 工具推文植入合作"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  客户称呼 / 机构 / 平台名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 李总 / 某跨境出海软件"
                  value={formData.clientOrPlatform}
                  onChange={(e) => setFormData({ ...formData, clientOrPlatform: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">收益类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="commercial_order">商单合作</option>
                    <option value="consulting">付费咨询</option>
                    <option value="coaching">陪跑辅导</option>
                    <option value="platform_incentive">平台激励</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">跟进阶段</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="inquiry">初步咨询</option>
                    <option value="negotiating">洽谈跟进</option>
                    <option value="confirmed">已签约/待交付</option>
                    <option value="delivered">已交付/待打款</option>
                    <option value="paid">已结算到账</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">预期/成交金额 (元)</label>
                  <label className="flex items-center space-x-1.5 text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amountUnknown}
                      onChange={(e) => setFormData({ ...formData, amountUnknown: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0"
                    />
                    <span>金额待定 / 未知</span>
                  </label>
                </div>
                {!formData.amountUnknown ? (
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="输入金额 (例如 3000)"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                ) : (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-400 text-[11px]">
                    保留为未知收益，不参与虚假金额累计，也不记为 0 元。
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">来源平台</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="x">X / 推特</option>
                    <option value="xiaohongshu">小红书</option>
                    <option value="gzh">公众号</option>
                    <option value="douyin">抖音</option>
                    <option value="channels">微信视频号</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">关联内容项目</label>
                  <select
                    value={formData.relatedProjectId}
                    onChange={(e) => setFormData({ ...formData, relatedProjectId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">(无关联 / 通用)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">线索备忘 / 需求要点</label>
                <textarea
                  rows={2}
                  placeholder="记录沟通要点、客户核心诉求或交付节点..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '确认收录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
