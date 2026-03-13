import React, { useEffect, useRef, useState } from 'react';
import { User, ExpenseRequest, RequestStatus, DirectiveSnapshot, UserRole } from '../types';
import { getAccountingRequests, updateRequestStatus, getDispatchedDirectives, updateDirectiveStatus, USERS, getInvoicesForAccountant, useSync, logActivity } from '../services/mockService';
import { LogAction } from '../types';
import * as XLSX from 'xlsx';
import {
  Calculator,
  CheckCircle2,
  Wallet,
  Download,
  Clock,
  Banknote,
  FileText,
  Check,
  Printer,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatNumber } from '../utils/formatters';
import { formatDateTbilisi } from '../utils/dateUtils';
import { loadDispatchedDirectives, saveDispatchedDirectives, markDirectiveProcessed } from '../storage/directiveStorage';
import { AccountantInvoicesView } from './InventoryInvoices';

// ─────────────────────────────────────────────────────────────────────────────
// AccountantDirectivesView
//   • Each directive card is collapsible (ჩაკეცვა)
//   • Each card has its own "ბეჭდვა" button that prints only that directive
//   • "შესრულებულია" button properly updates status across all storage sources
// ─────────────────────────────────────────────────────────────────────────────
export const AccountantDirectivesView: React.FC<{ user: User }> = ({ user }) => {
  const [directives, setDirectives] = useState<DirectiveSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Track which directives are expanded (all expanded by default)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Ref map for per-directive print targets
  const printRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const syncTrigger = useSync();

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch from Service (Standard Flow)
    const serviceData = await getDispatchedDirectives();

    // 2. Fetch from LocalStorage (Management Archive Bridge)
    const lsDataString = localStorage.getItem('mgmt_archive_history');
    let lsDirectives: DirectiveSnapshot[] = [];

    if (lsDataString) {
      try {
        const history = JSON.parse(lsDataString);
        lsDirectives = history
          .filter((item: any) => item.status === 'SENT')
          .map((item: any) => {
            const isProcessed =
              localStorage.getItem(`accounting_task_complete_${item.id}`) === 'true';
            return {
              id: `dir_ls_${item.id}`,
              weekNumber: 0,
              periodStart: item.date,
              periodEnd: item.date,
              dispatchedByUserId: 'u_fin',
              dispatchedByName: 'Fin Director',
              dispatchedAt: new Date(item.id).toISOString(),
              directivesData: item.data.map((d: any) => ({
                fundName: d.name,
                category: d.category,
                approvedAmount: d.approved,
              })),
              status: isProcessed ? 'processed' : 'pending',
              processedAt: isProcessed ? new Date().toISOString() : undefined,
            };
          });
      } catch (e) {
        console.error('Error parsing management archive history', e);
      }
    }

    // 3. Fetch from new dedicated storage (DirectiveSnapshot)
    const storedDirectives = loadDispatchedDirectives();

    // Deduplicate: Stored = source of truth
    const storedIds = new Set(storedDirectives.map((d) => d.id));

    const uniqueServiceData = serviceData.filter((d) => {
      const rawId = d.id.startsWith('dir_') ? d.id.substring(4) : d.id;
      return !storedIds.has(rawId) && !storedIds.has(d.id);
    });

    const combined = [...lsDirectives, ...uniqueServiceData, ...storedDirectives].reduce(
      (acc, curr) => {
        if (!acc.find((d) => d.id === curr.id)) acc.push(curr);
        return acc;
      },
      [] as DirectiveSnapshot[]
    );

    combined.sort(
      (a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()
    );

    setDirectives(combined);
    // Expand all by default
    setExpandedIds(new Set(combined.map((d) => d.id)));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const handleStorage = () => fetchData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncTrigger]);

  // ── Toggle collapse ────────────────────────────────────────────────────────
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Per-directive print ────────────────────────────────────────────────────
  const handlePrintDirective = (id: string) => {
    const el = printRefs.current[id];
    if (!el) return;

    logActivity(user, LogAction.EXPORT_DB, `Printed directive ${id}`);
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>დირექტივა</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: sans-serif; font-size: 12px; color: #000; padding: 24px; }
            h3 { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
            .processed { font-size: 11px; color: #166534; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #111; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
            th.right, td.right { text-align: right; }
            td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
            tr:last-child td { border-bottom: 2px solid #000; }
            .approved { font-weight: 800; color: #1d4ed8; }
            .total-row td { font-weight: 800; background: #f3f4f6; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // ── Mark as processed — FIXED ──────────────────────────────────────────────
  // Handles all 3 storage origins: dir_ls_ (LS archive), storedDirectives, serviceData
  const handleMarkAsProcessed = async (directive: DirectiveSnapshot) => {
    if (!window.confirm('ნამდვილად გსურთ დირექტივის შესრულებულად მონიშვნა?')) return;

    setProcessingId(directive.id);

    try {
      if (directive.id.startsWith('dir_ls_')) {
        // ── Origin: Management Archive LocalStorage ───────────────────────────
        const originalId = directive.id.replace('dir_ls_', '');
        localStorage.setItem(`accounting_task_complete_${originalId}`, 'true');

        // Also update the mgmt_archive_history item status for consistency
        const saved = localStorage.getItem('mgmt_archive_history');
        if (saved) {
          const history = JSON.parse(saved);
          const updated = history.map((item: any) =>
            String(item.id) === String(originalId) ? { ...item, status: 'SENT' } : item
          );
          localStorage.setItem('mgmt_archive_history', JSON.stringify(updated));
        }
      } else {
        // ── Origin: directiveStorage or mockService ───────────────────────────

        // 1. Update in mock service (best-effort, ignore errors)
        await updateDirectiveStatus(directive.id, 'processed', user.id).catch(() => {});
        if (!directive.id.startsWith('dir_')) {
          await updateDirectiveStatus(`dir_${directive.id}`, 'processed', user.id).catch(() => {});
        }

        // 2. Update / insert in persistent directiveStorage
        const allStored = loadDispatchedDirectives();
        const existingIndex = allStored.findIndex((d) => d.id === directive.id);

        if (existingIndex !== -1) {
          markDirectiveProcessed(directive.id, user.id);
        } else {
          // Not yet in storage — add it with processed status
          const newEntry: DirectiveSnapshot = {
            ...directive,
            status: 'processed',
            processedAt: new Date().toISOString(),
            processedByUserId: user.id,
          };
          saveDispatchedDirectives([...allStored, newEntry]);
        }
      }

      // Notify all tabs / components
      window.dispatchEvent(new Event('storage'));
      logActivity(user, LogAction.UPDATE_REQUEST, `Directive ${directive.id} marked as processed`);
      await fetchData();
    } catch (e) {
      console.error('Error updating directive status:', e);
      alert('სტატუსის განახლება ვერ მოხერხდა.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading)
    return <div className="p-12 text-center text-gray-500">იტვირთება დირექტივები...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-black pb-4">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight flex items-center gap-3">
          <FileText size={24} /> მენეჯეტის დირექტივები
        </h2>
        <p className="text-gray-500 font-bold text-sm">მხოლოდ წასაკითხი რეჟიმი</p>
      </div>

      {directives.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg text-gray-400">
          არ არის შემოსული დირექტივები.
        </div>
      ) : (
        <div className="space-y-3">
          {directives.map((directive) => {
            const isExpanded = expandedIds.has(directive.id);
            const isProcessed = directive.status === 'processed';
            const isProcessing = processingId === directive.id;
            const totalApproved = directive.directivesData.reduce(
              (s, i) => s + (i.approvedAmount || 0),
              0
            );

            return (
              <div
                key={directive.id}
                className={`border rounded-lg overflow-hidden shadow-sm bg-white transition-all ${
                  isProcessed ? 'border-green-200' : 'border-blue-200'
                }`}
              >
                {/* ── Card Header (always visible) ─────────────────────────── */}
                <div
                  className={`flex items-center justify-between p-4 border-b cursor-pointer select-none ${
                    isProcessed ? 'bg-green-50' : 'bg-blue-50'
                  }`}
                  onClick={() => toggleExpanded(directive.id)}
                >
                  {/* Left: chevron + title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-500 shrink-0">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base leading-tight">
                        {directive.weekNumber > 0
                          ? `კვირა #${directive.weekNumber}`
                          : 'დირექტივა'}{' '}
                        ({directive.periodStart}
                        {directive.periodStart !== directive.periodEnd
                          ? ` - ${directive.periodEnd}`
                          : ''}
                        )
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5">
                        გამოგზავნილია: <span className="font-bold">{directive.dispatchedByName}</span>
                        {' · '}
                        {new Date(directive.dispatchedAt).toLocaleString('ka-GE')}
                      </div>
                      {isProcessed && directive.processedAt && (
                        <div className="text-xs text-green-700 font-bold mt-0.5">
                          ✓ შესრულებულია: {new Date(directive.processedAt).toLocaleString('ka-GE')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: total + status badge + action buttons */}
                  <div
                    className="flex items-center gap-2 ml-4 shrink-0"
                    onClick={(e) => e.stopPropagation()} // don't collapse on button click
                  >
                    <span className="font-mono font-bold text-sm text-gray-700 hidden md:block">
                      {formatNumber(totalApproved)} ₾
                    </span>

                    {/* Status badge */}
                    {isProcessed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 size={12} /> შესრულებული
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkAsProcessed(directive)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold uppercase rounded shadow-sm hover:bg-green-700 active:scale-95 disabled:bg-gray-400 transition-all"
                      >
                        <Check size={14} />
                        {isProcessing ? 'მუშავდება...' : 'შესრულებულია'}
                      </button>
                    )}

                    {/* Per-directive print button */}
                    <button
                      onClick={() => handlePrintDirective(directive.id)}
                      className="p-2 text-gray-500 hover:bg-gray-200 rounded transition-colors"
                      title="ამ დირექტივის ბეჭდვა"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>

                {/* ── Collapsible body ─────────────────────────────────────── */}
                {isExpanded && (
                  <div>
                    {/* Hidden print target — always rendered but visually inside the card */}
                    <div
                      ref={(el) => { printRefs.current[directive.id] = el; }}
                      className="overflow-x-auto"
                    >
                      {/* Print-only header (hidden on screen) */}
                      <div className="hidden">
                        <h3>
                          {directive.weekNumber > 0
                            ? `კვირა #${directive.weekNumber}`
                            : 'დირექტივა'}{' '}
                          ({directive.periodStart} - {directive.periodEnd})
                        </h3>
                        <div className="meta">
                          გამოგზავნილია: {directive.dispatchedByName} —{' '}
                          {new Date(directive.dispatchedAt).toLocaleString('ka-GE')}
                        </div>
                        {isProcessed && directive.processedAt && (
                          <div className="processed">
                            შესრულებულია: {new Date(directive.processedAt).toLocaleString('ka-GE')}
                          </div>
                        )}
                      </div>

                      <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-2 font-bold text-left text-xs">ფონდი</th>
                            <th className="px-4 py-2 font-bold text-left text-xs">კატეგორია</th>
                            <th className="px-4 py-2 font-bold text-right text-xs">ხელმისაწვდომი (₾)</th>
                            <th className="px-4 py-2 font-bold text-right text-xs">განაწილება %</th>
                            <th className="px-4 py-2 font-bold text-right text-xs">გათვლილი (₾)</th>
                            <th className="px-4 py-2 font-bold text-right text-xs text-blue-600">
                              დამტკიცებული (₾)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {directive.directivesData.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-bold text-xs">{item.fundName}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{item.category}</td>
                              <td className="px-4 py-2 text-right font-mono text-gray-400 text-xs">
                                {formatNumber(item.availableAmount || 0)}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-gray-400 text-xs">
                                {item.distributionPercentage
                                  ? `${item.distributionPercentage.toFixed(2)}%`
                                  : '-'}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-gray-400 text-xs">
                                {formatNumber(item.calculatedAmount || 0)}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-blue-600 bg-blue-50/30 text-xs approved">
                                {formatNumber(item.approvedAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200 bg-gray-50 total-row">
                          <tr>
                            <td colSpan={5} className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">
                              სულ დამტკიცებული:
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 text-sm">
                              {formatNumber(totalApproved)} ₾
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// AccountingDashboard — unchanged except imports
// ─────────────────────────────────────────────────────────────────────────────
interface AccountingDashboardProps {
  user: User;
}

export const AccountingDashboard: React.FC<AccountingDashboardProps> = ({ user }) => {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'archive' | 'invoices' | 'directives'>('pending');
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [directivesCount, setDirectivesCount] = useState(0);
  const syncTrigger = useSync();

  const fetchRequests = async () => {
    const [data, invoices, directives] = await Promise.all([
      getAccountingRequests(),
      getInvoicesForAccountant(),
      getDispatchedDirectives(),
    ]);
    setRequests(data);
    setInvoicesCount(invoices.length);
    setDirectivesCount(directives.filter((d) => d.status === 'pending').length);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [syncTrigger]);

  const handlePay = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await updateRequestStatus(requestId, RequestStatus.PAID, user.id);
      logActivity(user, LogAction.UPDATE_REQUEST, `Request ${requestId} marked as PAID by accountant`);
      await fetchRequests();
    } catch (e) {
      console.error(e);
      alert('გადახდის დაფიქსირება ვერ მოხერხდა');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(
    (r) =>
      r.status === RequestStatus.DISPATCHED_TO_ACCOUNTING ||
      r.status === RequestStatus.APPROVED_FOR_PAYMENT
  );

  const archivedRequests = requests
    .filter((r) => r.status === RequestStatus.PAID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleExportPayments = () => {
    if (pendingRequests.length === 0) return;
    const dataToExport = pendingRequests.map((req) => ({
      თარიღი: formatDateTbilisi(new Date(req.createdAt)),
      მომთხოვნი: req.requesterName,
      'ხარჯის დასახელება': req.itemName || req.category,
      თანხა: req.totalAmount,
      ვალუტა: req.currency,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registry');
    XLSX.writeFile(workbook, `Payment_Registry.xlsx`);
    logActivity(user, LogAction.EXPORT_DB, 'Exported Payment Registry to Excel');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-mono">
        ფინანსური მონაცემები იტვირთება...
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
            <Calculator size={24} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tighter uppercase">მთავარი ბუღალტერი</h2>
            <p className="text-sm font-bold text-gray-500 tracking-wide uppercase">
              გადახდების პორტალი
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'pending' && pendingRequests.length > 0 && (
            <button
              onClick={handleExportPayments}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download size={16} />
              ექსელი რეესტრისთვის
            </button>
          )}

          <div className="flex gap-1 bg-gray-100 p-1 rounded-none border border-black">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border border-transparent ${
                activeTab === 'pending'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              მიმდინარე ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('directives')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border border-transparent ${
                activeTab === 'directives'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              დირექტივები
              {directivesCount > 0 && (
                <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">
                  {directivesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border border-transparent ${
                activeTab === 'invoices'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              ინვოისები
              {invoicesCount > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">
                  {invoicesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border border-transparent ${
                activeTab === 'archive'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              არქივი
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'pending' && (
        <>
          {pendingRequests.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 p-12 text-center bg-gray-50">
              <div className="w-16 h-16 bg-white border-2 border-gray-200 flex items-center justify-center mx-auto mb-4 rounded-full text-green-500">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-black uppercase tracking-tight">
                ყველა გადახდა შესრულებულია
              </h3>
              <p className="text-sm text-gray-500 font-medium mt-1">
                არ არის ახალი დადასტურებული მოთხოვნები.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-gray-700">
                      ხარჯის დასახელება
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-gray-700">
                      მომთხოვნი
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-gray-700">
                      დეპარტამენტი
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-gray-700 text-right">
                      ჯამური თანხა
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">
                      მოქმედება
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {pendingRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-black border-r border-gray-200">
                        {req.itemName || req.category}
                        <div className="flex items-center gap-1 text-xs font-normal text-blue-600 mt-0.5">
                          <Clock size={12} />
                          გადმოგზავნილია
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-black border-r border-gray-200">
                        {req.requesterName}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-black border-r border-gray-200">
                        {req.department}
                      </td>
                      <td className="px-6 py-4 text-right border-r border-gray-200 font-mono">
                        <span className="font-extrabold text-lg tracking-tight">
                          {formatNumber(req.totalAmount)}
                        </span>
                        <span className="ml-1 text-xs font-bold text-gray-500">{req.currency}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {processingId === req.id ? (
                          <span className="text-xs font-bold text-gray-400 animate-pulse uppercase">
                            მუშავდება...
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePay(req.id)}
                            className="px-6 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 mx-auto"
                          >
                            <Banknote size={16} /> გადახდა
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'invoices' && (
        <div className="mt-4 animate-in fade-in">
          <AccountantInvoicesView user={user} />
        </div>
      )}

      {activeTab === 'directives' && (
        <div className="mt-4 animate-in fade-in">
          <AccountantDirectivesView user={user} />
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">ხარჯი</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-right">
                  თანხა
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {archivedRequests.map((r) => (
                <tr key={r.id} className="border-b hover:bg-green-50/50">
                  <td className="px-6 py-3 text-sm">{r.itemName}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono">
                    {formatNumber(r.totalAmount)}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                      <CheckCircle2 size={12} /> გადახდილია
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};