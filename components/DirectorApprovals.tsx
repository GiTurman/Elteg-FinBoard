import React, { useEffect, useState, useMemo } from 'react';
import { User, ExpenseRequest, RequestStatus, UserRole, ExpenseFund, Priority, FundBalance } from '../types';
import { RequestDetail } from './RequestDetail';
import { 
  getDirectorBoardRequests, 
  updateRequestStatus, 
  updateRequestDetails,
  getExpenseFunds,
  getRealTimeFundBalances,
  useSync
} from '../services/mockService';
import { 
  Check, 
  X, 
  CornerUpLeft, 
  ArrowRight,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';
import { exportGenericToExcel } from '../utils/excelExport';
import { formatNumber } from '../utils/formatters';

interface DirectorApprovalsProps {
  user: User;
  currentStep?: number;
  initialSelectedDate?: string;
}

const StatusControl = ({ 
  current, 
  onChange, 
  disabled 
}: { 
  current: string | undefined;
  onChange: (val: string) => void; 
  disabled: boolean;
}) => (
  <div className="flex flex-col gap-1 items-center">
    <div className={`text-[9px] font-bold uppercase tracking-tight ${
      current === 'დასტურდება' ? 'text-green-600' : 
      current === 'ბრუნდება' ? 'text-yellow-600' : 
      current === 'უარყოფილია' ? 'text-red-600' : 'text-gray-400'
    }`}>
      {current || '—'}
    </div>
    <div className="flex gap-1">
      <button 
        onClick={() => onChange('დასტურდება')}
        disabled={disabled}
        title="დადასტურება"
        className={`p-1 rounded border transition-all ${
          current === 'დასტურდება'
            ? 'bg-green-500 text-white border-green-600 shadow-sm' 
            : 'bg-white text-gray-300 border-gray-200 hover:border-green-300 hover:text-green-400'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <button 
        onClick={() => onChange('ბრუნდება')}
        disabled={disabled}
        title="დაბრუნება"
        className={`p-1 rounded border transition-all ${
          current === 'ბრუნდება' 
            ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm' 
            : 'bg-white text-gray-300 border-gray-200 hover:border-yellow-300 hover:text-yellow-400'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <CornerUpLeft size={14} strokeWidth={3} />
      </button>
      <button 
        onClick={() => onChange('უარყოფილია')}
        disabled={disabled}
        title="უარყოფა"
        className={`p-1 rounded border transition-all ${
          current === 'უარყოფილია' 
            ? 'bg-red-500 text-white border-red-600 shadow-sm' 
            : 'bg-white text-gray-300 border-gray-200 hover:border-red-300 hover:text-red-400'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <X size={14} strokeWidth={3} />
      </button>
    </div>
  </div>
);

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const config: Record<string, { label: string; color: string }> = {
    [Priority.LOW]: { label: 'დაბალი', color: 'bg-blue-100 text-blue-800' },
    [Priority.MEDIUM]: { label: 'საშუალო', color: 'bg-yellow-100 text-yellow-800' },
    [Priority.HIGH]: { label: 'მაღალი', color: 'bg-red-100 text-red-800' },
    [Priority.CRITICAL]: { label: 'კრიტიკული', color: 'bg-purple-100 text-purple-800' },
  };
  const { label, color } = config[priority] || { label: 'N/A', color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${color}`}>{label}</span>;
};

export const DirectorApprovals: React.FC<DirectorApprovalsProps> = ({ user, currentStep, initialSelectedDate }) => {
  // All requests shown in one flat list — no date grouping
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [funds, setFunds] = useState<ExpenseFund[]>([]);
  const [fundBalances, setFundBalances] = useState<FundBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [notes, setNotes] = useState<Record<string, { director?: string; fin?: string; discussion?: string }>>({});

  const syncTrigger = useSync();
  const isFinDirector = user.role === UserRole.FIN_DIRECTOR;
  const isDirectorLevel = user.role === UserRole.CEO || user.role === UserRole.FOUNDER;

  const loadData = async () => {
    setLoading(true);
    const [fundData, balanceData, boardRequests] = await Promise.all([
      getExpenseFunds(),
      getRealTimeFundBalances(),
      getDirectorBoardRequests(),
    ]);
    setFunds(fundData);
    setFundBalances(balanceData);
    setRequests(boardRequests);

    // Initialise notes from saved data
    const init: Record<string, { director?: string; fin?: string; discussion?: string }> = {};
    boardRequests.forEach(r => {
      init[r.id] = {
        director: r.directorNote || '',
        fin: r.finDirectorNote || '',
        discussion: r.discussionResult || '',
      };
    });
    setNotes(init);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [syncTrigger]);

  // ── totals ──────────────────────────────────────────────────────────
  const pendingTotal = useMemo(
    () => requests.reduce((sum, r) => sum + r.totalAmount, 0),
    [requests]
  );

  // ── helpers ──────────────────────────────────────────────────────────
  const removeRequest = (id: string) =>
    setRequests(prev => prev.filter(r => r.id !== id));

  const handleNoteChange = (id: string, field: 'director' | 'fin' | 'discussion', value: string) =>
    setNotes(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveNotes = async (id: string) => {
    const n = notes[id];
    if (n) {
      await updateRequestDetails(id, {
        directorNote: n.director,
        finDirectorNote: n.fin,
        discussionResult: n.discussion,
      });
    }
  };

  // ── actions ──────────────────────────────────────────────────────────

  // Move to FD final approval (Step 11)
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await saveNotes(id);
      await updateRequestStatus(id, RequestStatus.FD_APPROVED, user.id);
      removeRequest(id);
    } catch (e) {
      alert('ოპერაცია ვერ შესრულდა');
    } finally {
      setProcessingId(null);
    }
  };

  // Return to manager with comment
  const handleReturn = async (id: string) => {
    setProcessingId(id);
    try {
      const comment = notes[id]?.discussion || '';
      await updateRequestDetails(id, {
        discussionResult: comment,
        lastComment: comment || 'დაბრუნდა კომენტარის გარეშე',
      });
      await updateRequestStatus(id, RequestStatus.RETURNED_TO_MANAGER, user.id);
      removeRequest(id);
    } catch (e) {
      alert('ოპერაცია ვერ შესრულდა');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject completely
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const comment = notes[id]?.discussion || '';
      await updateRequestDetails(id, {
        discussionResult: comment,
        lastComment: `საბჭოს მიერ უარყოფილია: ${comment || 'მიზეზი არ არის'}`,
      });
      await updateRequestStatus(id, RequestStatus.RETURNED_TO_MANAGER, user.id);
      removeRequest(id);
    } catch (e) {
      alert('ოპერაცია ვერ შესრულდა');
    } finally {
      setProcessingId(null);
    }
  };

  // Signature button (✓ / ↩ / ✗) — also triggers action for ↩ and ✗
  const handleSignatureChange = async (id: string, field: 'director' | 'fin', value: string) => {
    if (value === 'ბრუნდება') { await handleReturn(id); return; }
    if (value === 'უარყოფილია') { await handleReject(id); return; }

    handleNoteChange(id, field, value);
    const upd: Partial<ExpenseRequest> = {};
    if (field === 'director') upd.directorNote = value;
    if (field === 'fin') upd.finDirectorNote = value;
    await updateRequestDetails(id, upd);
  };

  const handleFundAssignment = async (id: string, fundId: string) => {
    await updateRequestDetails(id, { assignedFundId: fundId });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, assignedFundId: fundId } : r));
    const newBalances = await getRealTimeFundBalances();
    setFundBalances(newBalances);
  };

  const handleExport = () => {
    const headers = {
      requesterName: 'მომთხოვნი',
      department: 'დეპარტამენტი',
      itemName: 'ხარჯის დასახელება',
      totalAmount: 'ჯამური თანხა',
      currency: 'ვალუტა',
      assignedFundId: 'დაფინანსების წყარო',
      discussionResult: 'განხილვის შედეგი',
      finDirectorNote: 'ფინ. დირექტორი',
      directorNote: 'დირექტორი',
    };
    const data = requests.map(r => ({
      ...r,
      assignedFundId: funds.find(f => f.id === r.assignedFundId)?.name || '—',
      discussionResult: notes[r.id]?.discussion || r.discussionResult,
      finDirectorNote: notes[r.id]?.fin || r.finDirectorNote,
      directorNote: notes[r.id]?.director || r.directorNote,
    }));
    exportGenericToExcel(data, headers, 'Council Review', 'საბჭოს_განხილვა');
  };

  // ── render ────────────────────────────────────────────────────────────
  if (loading) return <div className="p-12 text-center text-gray-400">იტვირთება...</div>;

  return (
    <div className="space-y-6 font-sans relative">
      {selectedRequest && (
        <RequestDetail request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold uppercase">განსახილველი მოთხოვნები</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            სულ: <span className="font-bold text-black">{requests.length}</span> მოთხოვნა — 
            ჯამი: <span className="font-bold text-red-600 font-mono">{formatNumber(pendingTotal)} GEL</span>
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase rounded hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download size={16} /> Excel
        </button>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
          <h3 className="text-lg font-bold text-black">განსახილველი მოთხოვნები არ არის</h3>
          <p className="text-sm text-gray-500 mt-1">ყველა მოთხოვნა დამუშავებულია.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="w-full text-xs text-left bg-white">
            <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-300 uppercase tracking-tight whitespace-nowrap">
              <tr>
                <th className="px-3 py-3 border-r">#</th>
                <th className="px-3 py-3 border-r">მომთხოვნი / დეპარტამენტი</th>
                <th className="px-3 py-3 border-r min-w-[280px]">ხარჯის დასახელება</th>
                <th className="px-3 py-3 border-r text-right">თანხა</th>
                <th className="px-3 py-3 border-r w-52 text-center bg-blue-50/50">
                  <span className="flex items-center gap-1 justify-center"><Wallet size={12}/> ფონდი (ნაშთი)</span>
                </th>
                <th className="px-3 py-3 border-r min-w-[180px]">განხილვის შედეგი / კომენტარი</th>
                <th className="px-3 py-3 border-r bg-blue-50 text-center">ფინ. დირექტორი</th>
                <th className="px-3 py-3 border-r bg-blue-50 text-center">CEO</th>
                <th className="px-3 py-3 text-center bg-gray-100 sticky right-0 border-l border-gray-300 z-10">მოქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req, idx) => {
                const isFdApproved = notes[req.id]?.fin === 'დასტურდება';
                const hasAssignedFund = !!req.assignedFundId;
                const canMove = isFdApproved && hasAssignedFund;

                const assignedBalance = fundBalances.find(f => f.id === req.assignedFundId);
                const isInsufficient = assignedBalance ? assignedBalance.remaining < req.totalAmount : false;

                return (
                  <tr key={req.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-yellow-50 transition-colors`}>
                    
                    {/* # */}
                    <td className="px-3 py-3 border-r text-gray-400 font-bold align-top">{idx + 1}</td>

                    {/* Requester */}
                    <td className="px-3 py-3 border-r align-top whitespace-nowrap">
                      <div className="font-bold text-black">{req.requesterName}</div>
                      <div className="text-[10px] text-gray-500">{req.department}</div>
                      <div className="mt-1"><PriorityBadge priority={req.priority} /></div>
                    </td>

                    {/* Item */}
                    <td className="px-3 py-3 border-r align-top whitespace-normal">
                      <div className="font-bold text-black">{req.itemName || req.category}</div>
                      {req.description && (
                        <p className="text-[10px] text-gray-500 mt-0.5 italic">"{req.description}"</p>
                      )}
                      {req.revenuePotential && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          <span className="font-bold text-gray-600">პოტ:</span> {req.revenuePotential}
                        </p>
                      )}
                      {req.selectedOptionReason && (
                        <p className="text-[10px] text-gray-400">
                          <span className="font-bold text-gray-600">მოკვლ:</span> {req.selectedOptionReason}
                        </p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-3 border-r font-bold font-mono text-right text-red-600 align-top whitespace-nowrap">
                      -{formatNumber(req.totalAmount)} {req.currency}
                    </td>

                    {/* Fund selector */}
                    <td className="px-3 py-3 border-r bg-blue-50/20 text-center align-top">
                      {isFinDirector ? (
                        <div className="relative">
                          <select
                            value={req.assignedFundId || ''}
                            onChange={(e) => handleFundAssignment(req.id, e.target.value)}
                            className={`w-full text-[10px] p-1 border rounded outline-none focus:ring-1 focus:ring-black font-bold appearance-none
                              ${!req.assignedFundId ? 'border-red-300 bg-red-50 text-red-600' : 
                                isInsufficient ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-300 bg-white'}
                            `}
                          >
                            <option value="">— აირჩიეთ ფონდი —</option>
                            {fundBalances.map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({formatNumber(f.remaining)} ₾) {f.remaining < req.totalAmount ? '⚠️' : ''}
                              </option>
                            ))}
                          </select>
                          {isInsufficient && <AlertTriangle size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 border border-gray-200">
                          {funds.find(f => f.id === req.assignedFundId)?.name || '—'}
                        </span>
                      )}
                    </td>

                    {/* Comment / Discussion */}
                    <td className="px-2 py-2 border-r bg-gray-50/50 align-top">
                      <textarea
                        value={notes[req.id]?.discussion || ''}
                        onChange={(e) => handleNoteChange(req.id, 'discussion', e.target.value)}
                        onBlur={() => saveNotes(req.id)}
                        placeholder="კომენტარი (სავალდებულოა დაბრუნებისას)..."
                        className="w-full bg-white border border-gray-200 rounded p-1 text-[10px] h-14 resize-none focus:border-black outline-none"
                      />
                    </td>

                    {/* FD signature */}
                    <td className="px-2 py-3 border-r bg-blue-50/30 align-top text-center">
                      <StatusControl
                        current={notes[req.id]?.fin}
                        onChange={(val) => handleSignatureChange(req.id, 'fin', val)}
                        disabled={!isFinDirector}
                      />
                    </td>

                    {/* CEO signature */}
                    <td className="px-2 py-3 border-r bg-blue-50/30 align-top text-center">
                      <StatusControl
                        current={notes[req.id]?.director}
                        onChange={(val) => handleSignatureChange(req.id, 'director', val)}
                        disabled={!isDirectorLevel}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-center sticky right-0 bg-white border-l border-gray-300 z-10 align-top">
                      {processingId === req.id ? (
                        <span className="text-[10px] text-gray-400 animate-pulse">მუშავდება...</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Eye — view detail */}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title="დეტალები"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Return to manager */}
                          <button
                            onClick={() => handleReturn(req.id)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-yellow-500 text-white text-[10px] font-bold uppercase rounded hover:bg-yellow-600 transition-colors shadow"
                            title="დაბრუნება"
                          >
                            <CornerUpLeft size={12} /> დაბრ.
                          </button>

                          {/* Move to FD final */}
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={!canMove}
                            className="flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow"
                            title={
                              !isFdApproved ? 'საჭიროა FD-ს ხელმოწერა' :
                              !hasAssignedFund ? 'საჭიროა ფონდის მითითება' :
                              'გადატანა FD საბოლოო დასტურზე'
                            }
                          >
                            <ArrowRight size={12} /> გადატ.
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary footer */}
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td colSpan={3} className="px-3 py-3 text-right uppercase text-xs">სულ:</td>
                <td className="px-3 py-3 text-right font-mono text-red-700">
                  -{formatNumber(pendingTotal)} GEL
                </td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};