

import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Download, Upload } from 'lucide-react';
import { 
  getCurrencyRates, 
  updateCurrencyRates, 
  getInflationRate, 
  updateInflationRate, 
  useSync,
  exportDatabase,
  importDatabase
} from '../services/mockService';
import { Language } from '../types';

export const GlobalSettings: React.FC<{ language: Language }> = ({ language }) => {
  const [rates, setRates] = useState({ USD: 0, EUR: 0 });
  const [inflation, setInflation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncTrigger = useSync();

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      const [currentRates, currentInflation] = await Promise.all([
        getCurrencyRates(),
        getInflationRate()
      ]);
      setRates(currentRates);
      setInflation(currentInflation);
      setLoading(false);
    };
    fetchRates();
  }, [syncTrigger]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      updateCurrencyRates(rates),
      updateInflationRate(inflation)
    ]);
    setSaving(false);
    alert(language === 'ka' ? 'ინდიკატორები განახლდა!' : 'Indicators updated!');
  };

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finboard_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmImport = window.confirm(
      language === 'ka' 
        ? 'დარწმუნებული ხართ? არსებული მონაცემები სრულად ჩანაცვლდება!' 
        : 'Are you sure? Existing data will be completely replaced!'
    );

    if (!confirmImport) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabase(content);
      setImporting(false);
      if (success) {
        alert(language === 'ka' ? 'მონაცემები წარმატებით აღდგა!' : 'Data restored successfully!');
        window.location.reload();
      } else {
        alert(language === 'ka' ? 'აღდგენა ვერ მოხერხდა!' : 'Restore failed!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg text-black mb-4">
          {language === 'ka' ? 'ფინანსური ინდიკატორები' : 'Financial Indicators'}
        </h3>
        {loading ? <div>Loading rates...</div> : (
          <>
              <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                      <label className="font-bold text-sm">GEL / USD</label>
                      <input
                          type="number"
                          step="0.01"
                          value={rates.USD}
                          onChange={(e) => setRates(prev => ({ ...prev, USD: parseFloat(e.target.value) || 0 }))}
                          className="col-span-2 w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                      />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                      <label className="font-bold text-sm">GEL / EUR</label>
                      <input
                          type="number"
                          step="0.01"
                          value={rates.EUR}
                          onChange={(e) => setRates(prev => ({ ...prev, EUR: parseFloat(e.target.value) || 0 }))}
                          className="col-span-2 w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                      />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                      <label className="font-bold text-sm">
                        {language === 'ka' ? 'ინფლაციის მაჩვენებელი (%)' : 'Inflation Rate (%)'}
                      </label>
                      <input
                          type="number"
                          step="0.1"
                          value={inflation}
                          onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                          className="col-span-2 w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none"
                      />
                  </div>
              </div>
              <div className="mt-6 flex justify-end">
                  <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {language === 'ka' ? 'შენახვა' : 'Save Indicators'}
                  </button>
              </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg text-black mb-4">
          {language === 'ka' ? 'მონაცემთა ბაზის მართვა' : 'Database Management'}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {language === 'ka' 
            ? 'შეგიძლიათ გადმოწეროთ მონაცემთა ბაზის სრული ასლი ან აღადგინოთ იგი ფაილიდან.' 
            : 'You can download a full backup of the database or restore it from a file.'}
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            {language === 'ka' ? 'ბაზის შენახვა (Export)' : 'Export Database'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition-colors disabled:bg-gray-400"
          >
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            {language === 'ka' ? 'ბაზის აღდგენა (Import)' : 'Import Database'}
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
