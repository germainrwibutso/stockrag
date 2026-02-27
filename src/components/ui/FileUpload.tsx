import React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface FileUploadProps {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  handleFileUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ isDragging, setIsDragging, handleFileUpload, isLoading }) => {
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-[2.5rem] border-2 border-dashed transition-all duration-500 ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
          : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="absolute inset-0 bg-grid-zinc-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className={`w-20 h-20 rounded-3xl bg-white shadow-xl shadow-indigo-100 flex items-center justify-center mb-6 transition-transform duration-500 ${isDragging ? 'scale-110 rotate-3' : ''}`}>
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10 text-indigo-600" />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-zinc-900 mb-2">
          {isLoading ? 'Processing Data...' : 'Drop CSV File Here'}
        </h3>
        <p className="text-zinc-500 mb-8 max-w-sm mx-auto leading-relaxed">
          Upload your market data to begin analysis. We support standard OHLCV formats.
        </p>
        
        <div className="flex gap-4">
          <label className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all cursor-pointer shadow-lg shadow-zinc-200 hover:shadow-xl active:scale-95">
            Select File
            <input type="file" accept=".csv" className="hidden" onChange={onFileInput} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
