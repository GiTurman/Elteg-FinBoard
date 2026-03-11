import React, { useState, useRef, useEffect } from 'react';
import { Calculator, X, Delete } from 'lucide-react';

interface NumpadInputProps {
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const NumpadInput: React.FC<NumpadInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  min,
  max,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value.toString());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentValue(value.toString());
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, currentValue]);

  const handleClose = () => {
    setIsOpen(false);
    const numVal = parseFloat(currentValue);
    if (!isNaN(numVal)) {
      let finalVal = numVal;
      if (min !== undefined && finalVal < min) finalVal = min;
      if (max !== undefined && finalVal > max) finalVal = max;
      onChange(finalVal);
      setCurrentValue(finalVal.toString());
    } else {
      onChange(0);
      setCurrentValue('0');
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setCurrentValue('0');
    } else if (key === 'DEL') {
      setCurrentValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (key === '.') {
      if (!currentValue.includes('.')) {
        setCurrentValue(prev => prev + '.');
      }
    } else {
      setCurrentValue(prev => prev === '0' ? key : prev + key);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleInputBlur = () => {
    // We don't close immediately on blur to allow clicking the numpad buttons
    // The click outside listener handles closing when clicking away
  };

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={currentValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`w-full pr-8 ${className}`}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-2 text-gray-400 hover:text-blue-500 disabled:opacity-50"
          disabled={disabled}
        >
          <Calculator size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 p-3 bg-white border border-gray-200 rounded-xl shadow-2xl w-64 right-0 sm:left-0 sm:right-auto">
          <div className="flex justify-between items-center mb-3 pb-2 border-b">
            <span className="text-sm font-semibold text-gray-600">ნუმპადი</span>
            <button onClick={handleClose} className="text-gray-400 hover:text-red-500">
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="p-3 text-lg font-medium rounded-lg transition-colors bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-600 border border-gray-100"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeyPress('.')}
              className="p-3 text-lg font-medium rounded-lg transition-colors bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-600 border border-gray-100"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="p-3 text-lg font-medium rounded-lg transition-colors bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-600 border border-gray-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('DEL')}
              className="p-3 text-lg font-medium rounded-lg transition-colors bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 flex items-center justify-center"
            >
              <Delete size={20} />
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('C')}
              className="col-span-3 p-2 mt-1 text-sm font-bold rounded-lg transition-colors bg-gray-800 hover:bg-gray-900 text-white"
            >
              გასუფთავება (C)
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="col-span-3 p-3 mt-1 text-sm font-bold rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              დადასტურება
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
