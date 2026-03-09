

import React, { useState } from 'react';
import { User, UserRole, Language } from '../types';
import { 
  FileText, 
  Globe,
  Lock
} from 'lucide-react';
import { 
  USERS
} from '../services/mockService';

interface LandingPageProps {
  onLogin: (user: User) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}



export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, language, setLanguage }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'GE' : 'EN');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = Object.values(USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
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
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition-all font-bold text-sm"
            >
            <Globe size={16} />
            <span>{language === 'EN' ? 'ქართული' : 'English'}</span>
            </button>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-md mx-auto mt-20">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-100">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Lock size={20} className="text-gray-400" />
              {language === 'EN' ? 'Authentication' : 'ავტორიზაცია'}
            </h3>
          </div>
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {language === 'EN' ? 'Email' : 'ელ. ფოსტა'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                placeholder={language === 'EN' ? 'Enter your email' : 'შეიყვანეთ ელ. ფოსტა'}
                required
              />
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
      </main>

      <footer className="max-w-7xl mx-auto mt-12 text-center text-xs text-gray-400 uppercase tracking-widest">
        © 2024 Financial Board Systems
      </footer>
    </div>
  );
};
