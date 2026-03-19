
import React, { useState, useEffect } from 'react';
import { LogEntry, Language, User, UserRole } from '../types';
import { getActivityLogs, useSync } from '../services/mockService';
import { Clock, User as UserIcon, Activity, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export const ActivityLogs: React.FC<{ user: User; language: Language }> = ({ user, language }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState(true);
  const syncTrigger = useSync();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await getActivityLogs();
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [syncTrigger]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'ALL' || log.userRole === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (user.role !== UserRole.FIN_DIRECTOR && user.role !== UserRole.FOUNDER) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-gray-200 rounded">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          <div>
            <h3 className="font-bold text-lg text-black flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              {language === 'GE' ? 'აქტივობების ლოგი' : 'Activity Logs'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'GE' 
                ? 'სისტემაში განხორციელებული მოქმედებების სრული ისტორია' 
                : 'Full history of actions performed in the system'}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text"
                placeholder={language === 'GE' ? 'ძებნა...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:border-black outline-none w-48"
              />
            </div>
            
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:border-black outline-none bg-white"
            >
              <option value="ALL">{language === 'GE' ? 'ყველა როლი' : 'All Roles'}</option>
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200">
                <th className="px-6 py-3">{language === 'GE' ? 'დრო' : 'Time'}</th>
                <th className="px-6 py-3">{language === 'GE' ? 'მომხმარებელი' : 'User'}</th>
                <th className="px-6 py-3">{language === 'GE' ? 'მოქმედება' : 'Action'}</th>
                <th className="px-6 py-3">{language === 'GE' ? 'დეტალები' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="animate-spin" size={16} />
                      {language === 'GE' ? 'იტვირთება...' : 'Loading logs...'}
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    {language === 'GE' ? 'ჩანაწერები არ მოიძებნა' : 'No logs found'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <UserIcon size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-black">{log.userName}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{log.userRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action.includes('LOGIN') ? 'bg-green-100 text-green-700' :
                        log.action.includes('LOGOUT') ? 'bg-gray-100 text-gray-700' :
                        log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-700' :
                        log.action.includes('APPROVE') ? 'bg-emerald-100 text-emerald-700' :
                        log.action.includes('REJECT') ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {isExpanded && filteredLogs.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-right">
          {language === 'GE' 
            ? `ნაჩვენებია ${filteredLogs.length} ჩანაწერი` 
            : `Showing ${filteredLogs.length} entries`}
        </div>
      )}
    </div>
  );
};
