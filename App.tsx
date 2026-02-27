
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { RequestForm } from './components/RequestForm';
import { Dashboard } from './components/Dashboard';
import { UserManagement } from './components/UserManagement';
import { LandingPage } from './components/LandingPage';
import { FinancialCouncil } from './components/FinancialCouncil'; // New Import
import { AccountingDashboard, AccountantDirectivesView } from './components/AccountingDashboard';
import { GlobalArchive } from './components/GlobalArchive';
import { Budgeting } from './components/Budgeting'; // PROMPT 414
import { BudgetAnalysis } from './components/BudgetAnalysis'; // PROMPT 7.3-008
import { CashInflowView } from './components/CashInflowView'; // PROMPT 6.1-006
import { GlobalSettings } from './components/GlobalSettings'; // PROMPT 6.2-009
import { RevenueAnalysis } from './components/RevenueAnalysis'; // PROMPT 6.7-001
import { ManagementView } from './components/ManagementView'; // PROMPT 7.1-002
import { ProformaInvoiceForm } from './components/ProformaInvoiceForm'; 
import { GeneratedInvoicesView, AccountantInvoicesView } from './components/InventoryInvoices'; // UPDATED IMPORT
// PROMPT 6.1-008: CashInflowEntryView is removed as its logic is merged into CashInflowView
import { 
  USERS
} from './services/mockService';
import { User, UserRole, Language } from './types';
import { Database, CheckCircle, Loader2, Download, Lock } from 'lucide-react';

const AccessDenied: React.FC = () => (
    <div className="p-12 text-center text-red-500 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
        <Lock size={32} className="mx-auto text-red-600 mb-4" />
        <h3 className="text-xl font-bold text-red-800">წვდომა შეზღუდულია</h3>
        <p className="mt-2 text-sm text-red-700">
            თქვენ არ გაქვთ ამ მოდულის ნახვის უფლება.
        </p>
    </div>
);

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('finboard_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('finboard_active_tab') || 'dashboard';
  });
  const [language, setLanguage] = useState<Language>('GE');
  
  const [syncTrigger, setSyncTrigger] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncTrigger(prev => prev + 1);
    window.addEventListener('finboard_sync', handleSync);
    return () => window.removeEventListener('finboard_sync', handleSync);
  }, []);

  // PROMPT 6.7-004: Sidebar is now permanently expanded as per strict constraints.
  const isSidebarExpanded = true;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('finboard_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('finboard_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('finboard_active_tab', activeTab);
  }, [activeTab]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // If not logged in, show Landing Page
  if (!currentUser) {
    return (
      <LandingPage 
        onLogin={handleLogin} 
        language={language} 
        setLanguage={setLanguage} 
      />
    );
  }

  const isAdmin = currentUser.role === UserRole.FOUNDER || currentUser.role === UserRole.FIN_DIRECTOR;
  const isTopLevel = currentUser.role === UserRole.FOUNDER || currentUser.role === UserRole.FIN_DIRECTOR || currentUser.role === UserRole.CEO;
  const isManagerLevel = [UserRole.COMMERCIAL_DIRECTOR, UserRole.TECH_DIRECTOR, UserRole.ADMIN, UserRole.MANAGER, UserRole.PARTS_MANAGER].includes(currentUser.role);
  const isAccountant = currentUser.role === UserRole.ACCOUNTANT;
  const isSubAccountant = currentUser.role === UserRole.SUB_ACCOUNTANT;
  const canViewGlobalArchive = currentUser.role === UserRole.FOUNDER || currentUser.role === UserRole.FIN_DIRECTOR;
  
  const canViewInventory = [
    UserRole.FOUNDER,
    UserRole.FIN_DIRECTOR,
    UserRole.CEO,
    UserRole.COMMERCIAL_DIRECTOR,
    UserRole.ACCOUNTANT,
    UserRole.SUB_ACCOUNTANT,
    UserRole.PARTS_MANAGER
  ].includes(currentUser.role);

  // PROMPT 6.8-003: Refined role-based access for Revenue Analysis
  const isCommercialDirector = currentUser.role === UserRole.COMMERCIAL_DIRECTOR;
  const isTechDirector = currentUser.role === UserRole.TECH_DIRECTOR;
  const canViewProjects = isTopLevel || isCommercialDirector;
  const canViewServiceAndParts = isTopLevel || isTechDirector;

  return (
    <>
      <Layout 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        isSidebarExpanded={isSidebarExpanded}
      >
        {activeTab === 'dashboard' && (
          <Dashboard user={currentUser} />
        )}
        
        {/* UPDATED: Route 'approvals' to the new Financial Council Engine */}
        {activeTab === 'approvals' && isTopLevel && (
          <FinancialCouncil user={currentUser} />
        )}
        
        {/* PROMPT 6.1-008: Revert 'council-share' to a placeholder */}
        {activeTab === 'council-share' && (isTopLevel || isManagerLevel) && (
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-xl font-bold text-black">გაზიარების მოდული</h3>
            <p className="mt-2 text-sm">ეს სექცია განკუთვნილია შიდა ინფორმაციის გასაზიარებლად.</p>
          </div>
        )}

        {/* PROMPT 7.1-002: Implement ManagementView for 'management' tab */}
        {activeTab === 'management' && (
          // FIX: Pass the 'user' prop to the ManagementView component as it is required.
          isTopLevel ? <ManagementView user={currentUser} /> : <AccessDenied />
        )}

        {/* BUDGETING ROUTES (PROMPT 414) */}
        {activeTab === 'prev-year-budget' && (
          isTopLevel ? <Budgeting user={currentUser} year={2025} /> : <AccessDenied />
        )}
        {activeTab === 'curr-year-budget' && (
          isTopLevel ? <Budgeting user={currentUser} year={2026} /> : <AccessDenied />
        )}
        {activeTab === 'budget-analysis' && (
          isTopLevel ? <BudgetAnalysis user={currentUser} /> : <AccessDenied />
        )}

        {/* PROMPT 6.1-008: Corrected Cash Inflow Route */}
        {activeTab === 'cash-inflow' && (isTopLevel || isManagerLevel) && (
          <CashInflowView user={currentUser} />
        )}

        {/* PROMPT 6.7-001 & 6.8-003: Isolated and Role-Restricted Revenue Analysis Modules */}
        {activeTab === 'revenue-projects' && (
          canViewProjects ? <RevenueAnalysis category="პროექტები" /> : <AccessDenied />
        )}
        {activeTab === 'revenue-service' && (
          canViewServiceAndParts ? <RevenueAnalysis category="სერვისი" /> : <AccessDenied />
        )}
        {activeTab === 'revenue-parts' && (
          canViewServiceAndParts ? <RevenueAnalysis category="ნაწილები" /> : <AccessDenied />
        )}

        {activeTab === 'accounting' && isAccountant && (
          <AccountingDashboard user={currentUser} />
        )}
        {activeTab === 'accounting-directives' && isAccountant && (
          <AccountantDirectivesView user={currentUser} />
        )}

        {/* FIX: Render AccountantInvoicesView for the Sub-Accountant role */}
        {activeTab === 'sub-accounting-proforma' && isSubAccountant && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AccountantInvoicesView user={currentUser} />
          </div>
        )}

        {/* NEW: Render GeneratedInvoicesView for the Sub-Accountant role */}
        {activeTab === 'sub-accounting-generated' && isSubAccountant && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GeneratedInvoicesView user={currentUser} />
          </div>
        )}

        {activeTab === 'inventory-proforma' && (
          canViewInventory ? <ProformaInvoiceForm user={currentUser} /> : <AccessDenied />
        )}

        {activeTab === 'inventory-generated' && (
          canViewInventory ? <GeneratedInvoicesView user={currentUser} /> : <AccessDenied />
        )}

        {activeTab === 'customers' && (isTopLevel || isManagerLevel) && (
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 mt-10">
            <h3 className="text-xl font-bold text-black">მომხმარებლები (კლიენტები)</h3>
            <p className="mt-2 text-sm">მოდული დამუშავების პროცესშია. ლოგიკა დაემატება მოგვიანებით.</p>
          </div>
        )}
        
        {activeTab === 'global-archive' && canViewGlobalArchive && (
          <GlobalArchive user={currentUser} />
        )}

        {activeTab === 'request' && (
          <RequestForm 
            user={currentUser} 
            onSuccess={() => setActiveTab('dashboard')} 
          />
        )}
        
        {activeTab === 'users' && isAdmin && (
          <UserManagement currentUser={currentUser} language={language} />
        )}
        
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold mb-2 text-black">{language === 'EN' ? 'Settings' : 'პარამეტრები'}</h2>
              <div className="mt-4 p-4 bg-gray-50 text-gray-800 rounded border border-gray-200 inline-block text-sm font-medium">
                {language === 'EN' ? 'Current Role:' : 'მიმდინარე როლი:'} <strong>{currentUser.role}</strong>
              </div>
            </div>
            
            {isAdmin && <GlobalSettings language={language} />}
          </div>
        )}
      </Layout>
    </>
  );
}

export default App;
