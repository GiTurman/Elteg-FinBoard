

import React, { useState } from 'react';
import { User, UserRole, Language } from '../types';
import { 
  Briefcase, 
  TrendingUp, 
  Settings, 
  Users, 
  FileText, 
  Shield, 
  PenTool,
  Globe,
  BarChart3,
  Calculator,
  PlayCircle,
  Database,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Package, // Added for Parts Manager
  X,
  Lock
} from 'lucide-react';
import { 
  USERS,
  generatePendingManagerRequests,
  generatePendingDirectorRequests,
  generateAccountingRequests,
  generateTechAdminRequests,
  clearAllRequests
} from '../services/mockService';

interface LandingPageProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onRunTestFlow: () => void;
}

const ROLES_CONFIG = [
  {
    role: UserRole.FOUNDER,
    title: { EN: 'Founder', GE: 'დამფუძნებელი' },
    icon: Shield,
  },
  {
    role: UserRole.FIN_DIRECTOR,
    title: { EN: 'Financial Director', GE: 'ფინანსური დირექტორი' },
    icon: TrendingUp,
  },
  {
    role: UserRole.CEO,
    title: { EN: 'CEO', GE: 'აღმასრულებელი დირექტორი' },
    icon: Briefcase,
  },
  {
    role: UserRole.COMMERCIAL_DIRECTOR,
    title: { EN: 'Commercial Director', GE: 'კომერციული დირექტორი' },
    icon: BarChart3,
  },
  {
    role: UserRole.TECH_DIRECTOR,
    title: { EN: 'Technical Director', GE: 'ტექნიკური დირექტორი' },
    icon: Settings,
  },
  {
    role: UserRole.ADMIN,
    title: { EN: 'Administrative Manager', GE: 'ადმინისტრაციული მენეჯერი' },
    icon: Users,
  },
  {
    role: UserRole.PARTS_MANAGER,
    title: { EN: 'Parts Manager', GE: 'ნაწილების მენეჯერი' },
    icon: Package,
  },
  {
    role: UserRole.ACCOUNTANT,
    title: { EN: 'Chief Accountant', GE: 'მთავარი ბუღალტერი' },
    icon: Calculator,
  },
  {
    role: UserRole.SUB_ACCOUNTANT,
    title: { EN: 'Accountant', GE: 'ბუღალტერი' },
    icon: Calculator,
  },
  {
    role: UserRole.EMPLOYEE,
    title: { EN: 'Employee', GE: 'დასაქმებული' },
    icon: PenTool,
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, language, setLanguage, onRunTestFlow }) => {
  const [automationStatus, setAutomationStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Login Modal State
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'GE' : 'EN');
  };

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    const usersWithRole = Object.values(USERS).filter(u => u.role === role);
    if (usersWithRole.length > 0) {
      setSelectedUserId(usersWithRole[0].id);
    }
    setPassword('');
    setLoginError('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS[selectedUserId];
    if (!user) {
      setLoginError(language === 'EN' ? 'User not found' : 'მომხმარებელი არ მოიძებნა');
      return;
    }
    if (user.password !== password) {
      setLoginError(language === 'EN' ? 'Incorrect password' : 'არასწორი პაროლი');
      return;
    }
    onLogin(user);
  };

  const runAutomation = async (action: () => Promise<void>, successMessage: string) => {
    setIsProcessing(true);
    setAutomationStatus(null);
    try {
      await action();
      setAutomationStatus(successMessage);
      setTimeout(() => setAutomationStatus(null), 3000);
    } catch (error) {
      console.error(error);
      setAutomationStatus('შეცდომა ოპერაციის დროს');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans p-6 md:p-12 pb-32">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-16 border-b border-black pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded">
            <FileText size={24} />
          </div>
          <div>
             <h1 className="text-2xl font-extrabold tracking-tight uppercase">ფინანსური საბჭო</h1>
             <p className="text-xs font-bold tracking-widest text-gray-500">Elevators Corp.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={onRunTestFlow}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black border border-yellow-500 rounded hover:bg-yellow-300 transition-all font-bold text-sm shadow-sm"
            >
                <PlayCircle size={16} />
                <span>Test Flow</span>
            </button>
            <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition-all font-bold text-sm"
            >
            <Globe size={16} />
            <span>{language === 'EN' ? 'ქართული' : 'English'}</span>
            </button>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto">
        <div className="mb-8">
           <h2 className="text-4xl font-extrabold mb-2">{language === 'EN' ? 'Select Role' : 'აირჩიეთ როლი'}</h2>
           <p className="text-gray-500">{language === 'EN' ? 'Enter the dashboard as:' : 'სისტემაში შესვლა როგორც:'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES_CONFIG.map((item) => (
            <button
              key={item.role}
              onClick={() => handleRoleClick(item.role)}
              className="flex flex-col text-left p-6 border border-gray-200 hover:border-black transition-all group bg-white hover:shadow-lg rounded-sm h-full"
            >
              <div className="mb-6 p-3 bg-gray-50 group-hover:bg-black group-hover:text-white w-fit rounded transition-colors">
                <item.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title[language]}</h3>
              
              <div className="mt-auto pt-6 text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-black">
                {language === 'EN' ? 'Login →' : 'შესვლა →'}
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Login Modal */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lock size={20} className="text-gray-400" />
                {language === 'EN' ? 'Authentication' : 'ავტორიზაცია'}
              </h3>
              <button onClick={() => setSelectedRole(null)} className="text-gray-400 hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {language === 'EN' ? 'Select User' : 'აირჩიეთ მომხმარებელი'}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                >
                  {Object.values(USERS)
                    .filter(u => u.role === selectedRole)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {language === 'EN' ? 'Password' : 'პაროლი'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                  placeholder="••••••"
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded border border-red-100">
                  {loginError}
                </div>
              )}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-black text-white font-bold rounded hover:bg-gray-800 transition-colors uppercase text-sm tracking-wider"
                >
                  {language === 'EN' ? 'Sign In' : 'შესვლა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Automation Panel (Prompt 122) */}
      <section className="max-w-7xl mx-auto mt-20 pt-8 border-t-2 border-dashed border-gray-300">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-black" size={24} />
            <h3 className="text-xl font-extrabold uppercase tracking-tight">სისტემური ტესტირება</h3>
            {automationStatus && (
              <span className="ml-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full animate-pulse flex items-center gap-1">
                <CheckCircle2 size={12} /> {automationStatus}
              </span>
            )}
            {isProcessing && (
              <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase rounded-full flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" /> მუშავდება...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <button 
              onClick={() => runAutomation(generatePendingManagerRequests, 'ახალი მოთხოვნები დაგენერირდა')}
              disabled={isProcessing}
              className="px-4 py-3 bg-white border border-gray-300 text-black font-bold text-xs uppercase hover:bg-black hover:text-white hover:border-black transition-colors rounded shadow-sm disabled:opacity-50"
            >
              გენერაცია: ახალი მოთხოვნები
            </button>
            <button 
              onClick={() => runAutomation(generateTechAdminRequests, 'ტექ/ადმინ რიგი შეივსო')}
              disabled={isProcessing}
              className="px-4 py-3 bg-white border border-gray-300 text-black font-bold text-xs uppercase hover:bg-black hover:text-white hover:border-black transition-colors rounded shadow-sm disabled:opacity-50"
            >
              გენერაცია: ტექნიკური/ადმინისტრაციული
            </button>
            <button 
              onClick={() => runAutomation(generatePendingDirectorRequests, 'დირექტორის რიგი შეივსო')}
              disabled={isProcessing}
              className="px-4 py-3 bg-white border border-gray-300 text-black font-bold text-xs uppercase hover:bg-black hover:text-white hover:border-black transition-colors rounded shadow-sm disabled:opacity-50"
            >
              გენერაცია: დირექტორის რიგში
            </button>
            <button 
              onClick={() => runAutomation(generateAccountingRequests, 'ბუღალტერიის რიგი შეივსო')}
              disabled={isProcessing}
              className="px-4 py-3 bg-white border border-gray-300 text-black font-bold text-xs uppercase hover:bg-black hover:text-white hover:border-black transition-colors rounded shadow-sm disabled:opacity-50"
            >
              გენერაცია: ბუღალტერიის რიგში
            </button>
            <button 
              onClick={() => runAutomation(clearAllRequests, 'ბაზა გასუფთავდა')}
              disabled={isProcessing}
              className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 font-bold text-xs uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors rounded shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={14} /> ბაზის გასუფთავება
            </button>
          </div>
          
          <p className="mt-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            გაფრთხილება: ეს პანელი განკუთვნილია მხოლოდ დეველოპმენტისთვის და მონაცემთა სიმულაციისთვის.
          </p>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto mt-12 text-center text-xs text-gray-400 uppercase tracking-widest">
        © 2024 Financial Board Systems
      </footer>
    </div>
  );
};
