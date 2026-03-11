import React from 'react';
import { ExpenseRequest, Currency, Priority } from '../types';
import { formatNumber } from '../utils/formatters';
import { formatDateTbilisi } from '../utils/dateUtils';
import { X, DollarSign, FileText, Calendar, User, Tag, TrendingUp } from 'lucide-react';

interface RequestDetailProps {
  request: ExpenseRequest;
  onClose: () => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({ request, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold uppercase tracking-tight">მოთხოვნის დეტალები</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">მომთხოვნი</label>
              <p className="font-bold">{request.requesterName}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">დეპარტამენტი</label>
              <p className="font-bold">{request.department}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">თარიღი</label>
              <p className="font-bold">{formatDateTbilisi(new Date(request.date))}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">სტატუსი</label>
              <p className="font-bold capitalize">{request.status}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-4 text-black">
              <DollarSign size={18} />
              <h3 className="font-bold uppercase">ფინანსური დეტალები</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">დასახელება</label>
                <p className="font-bold">{request.itemName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">ჯამური თანხა</label>
                <p className="font-bold text-red-600">{formatNumber(request.totalAmount)} {request.currency}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">რაოდენობა</label>
                <p className="font-bold">{request.quantity}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">ერთეულის ფასი</label>
                <p className="font-bold">{formatNumber(request.unitPrice)} {request.currency}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-4 text-black">
              <FileText size={18} />
              <h3 className="font-bold uppercase">დასაბუთება</h3>
            </div>
            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded italic">"{request.description}"</p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 mb-4 text-black">
              <TrendingUp size={18} />
              <h3 className="font-bold uppercase">სტრატეგიული ინფორმაცია</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">შემოსავლის ზრდის პოტენციალი</label>
                <p className="text-sm text-gray-700">{request.revenuePotential}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">შერჩევის მიზეზი</label>
                <p className="text-sm text-gray-700">{request.selectedOptionReason}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
