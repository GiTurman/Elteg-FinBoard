import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAnnualBudget, useSync } from '../services/mockService';
import { formatNumber } from '../utils/formatters';
import { Save } from 'lucide-react';

interface BudgetFactProps {
  user: User;
  year: number;
}

export const BudgetFact: React.FC<BudgetFactProps> = ({ user, year }) => {
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const syncTrigger = useSync();

  useEffect(() => {
    const loadBudget = async () => {
      setLoading(true);
      const data = await getAnnualBudget(year);
      
      // Load saved manual facts
      const savedFacts = JSON.parse(localStorage.getItem(`finboard_budget_facts_${year}`) || '{}');
      
      const processedData = data.map((item: any) => {
        if (savedFacts[item.id]) {
          const newMonthlyData = item.monthlyData.map((m: any, i: number) => ({
            ...m,
            fact: savedFacts[item.id][i]
          }));
          return { ...item, monthlyData: newMonthlyData };
        }
        return item;
      });

      setBudgetData(processedData);
      setLoading(false);
    };
    loadBudget();
  }, [year, syncTrigger]);

  const handleFactChange = (itemId: string, monthIndex: number, rawValue: string) => {
    let newValue = parseFloat(rawValue);
    if (isNaN(newValue)) newValue = 0;

    setBudgetData(prevData => prevData.map(item => {
      if (item.id === itemId) {
        const newMonthlyData = [...item.monthlyData];
        newMonthlyData[monthIndex] = { ...newMonthlyData[monthIndex], fact: newValue };
        return { ...item, monthlyData: newMonthlyData };
      }
      return item;
    }));
  };

  const handleSaveFacts = () => {
    const savedFacts: Record<string, number[]> = {};
    budgetData.forEach(item => {
      savedFacts[item.id] = item.monthlyData.map((m: any) => m.fact);
    });
    localStorage.setItem(`finboard_budget_facts_${year}`, JSON.stringify(savedFacts));
    alert('მონაცემები შენახულია');
  };

  if (loading) return <div className="p-12 text-center text-gray-400">იტვირთება...</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center border-b border-black pb-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight">2026 ფაქტი</h1>
        <button 
          onClick={handleSaveFacts}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Save size={16} /> შენახვა
        </button>
      </div>

      <div className="border rounded-lg shadow-sm border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-xs font-bold uppercase border-b">კატეგორია</th>
              {['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'].map(m => (
                <th key={m} className="p-3 text-xs font-bold uppercase text-right border-b">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgetData.map((item, idx) => (
              <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="p-3 text-xs font-bold border-r">{item.name}</td>
                {item.monthlyData.map((m: any, i: number) => (
                  <td key={i} className="p-1">
                    <input
                      type="number"
                      value={m.fact === 0 ? '' : m.fact}
                      onChange={(e) => handleFactChange(item.id, i, e.target.value)}
                      className="w-full text-right bg-white border border-gray-300 rounded outline-none p-1.5 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
