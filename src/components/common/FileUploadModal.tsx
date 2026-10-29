import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2, X } from 'lucide-react';

export type AllowedUploadCategory = 'text' | 'word_list' | 'book_pdf' | 'audio';

interface FileUploadModalProps {
  category: AllowedUploadCategory;
  isOpen: boolean;
  onClose: () => void;
  onFileProcessed: (file: { name: string; content: string; size: number; mimeType: string }) => void;
}

const CATEGORY_CONFIG: Record<
  AllowedUploadCategory,
  { label: string; extensions: string[]; maxSizeBytes: number; maxSizeMb: number; mimeAccept: string }
> = {
  word_list: {
    label: "So'zlar ro'yxati (TXT yoki CSV)",
    extensions: ['.txt', '.csv'],
    maxSizeBytes: 2 * 1024 * 1024,
    maxSizeMb: 2,
    mimeAccept: '.txt,.csv,text/plain,text/csv',
  },
  text: {
    label: 'Inglizcha Matn (TXT)',
    extensions: ['.txt'],
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeMb: 5,
    mimeAccept: '.txt,text/plain',
  },
  book_pdf: {
    label: 'Kitob (PDF)',
    extensions: ['.pdf'],
    maxSizeBytes: 25 * 1024 * 1024,
    maxSizeMb: 25,
    mimeAccept: '.pdf,application/pdf',
  },
  audio: {
    label: 'Audio (MP3, WAV, M4A)',
    extensions: ['.mp3', '.wav', '.m4a'],
    maxSizeBytes: 50 * 1024 * 1024,
    maxSizeMb: 50,
    mimeAccept: 'audio/*',
  },
};

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  category,
  isOpen,
  onClose,
  onFileProcessed,
}) => {
  const config = CATEGORY_CONFIG[category];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    // 1. Size check
    if (file.size > config.maxSizeBytes) {
      return `Fayl hajmi ruxsat etilgan limitdan (${config.maxSizeMb} MB) oshib ketdi. Fayl: ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)} MB.`;
    }

    // 2. Extension check
    const nameLower = file.name.toLowerCase();
    const hasValidExt = config.extensions.some((ext) => nameLower.endsWith(ext));
    if (!hasValidExt) {
      return `Fayl formati noto'g'ri. Ruxsat etilgan: ${config.extensions.join(', ')}`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setIsSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleStartUpload = () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    // Simulated reliable upload progress with UTF-8 reader
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 25;
      });
    }, 80);

    const reader = new FileReader();

    reader.onload = (event) => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsSuccess(true);
      setUploading(false);

      const content = (event.target?.result as string) || '';
      setTimeout(() => {
        onFileProcessed({
          name: selectedFile.name,
          content,
          size: selectedFile.size,
          mimeType: selectedFile.type || 'text/plain',
        });
        handleClose();
      }, 400);
    };

    reader.onerror = () => {
      clearInterval(progressInterval);
      setUploading(false);
      setErrorMessage("Faylni o'qishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    };

    // For text and word list, read as text; for binary (PDF/Audio) read as dataURL
    if (category === 'word_list' || category === 'text') {
      reader.readAsText(selectedFile, 'UTF-8');
    } else {
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploading(false);
    setErrorMessage(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FAF9F5] border border-[#E5E2D9] rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D9] mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-800" />
            <h3 className="font-serif font-bold text-gray-900 text-base">Fayl Yuklash</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-600 mb-4">
          <p className="font-medium text-gray-800">{config.label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Maksimal hajm: {config.maxSizeMb} MB. Formatlar: {config.extensions.join(', ')}
          </p>
        </div>

        {/* Drag and Drop Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#D5D1C6] hover:border-teal-700 rounded-xl p-6 text-center cursor-pointer bg-white transition-colors"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={config.mimeAccept}
            className="hidden"
          />
          <File className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          {selectedFile ? (
            <div>
              <p className="text-xs font-semibold text-gray-900 truncate max-w-xs mx-auto">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-700">
                Faylni tanlash uchun shu yerga bosing
              </p>
              <p className="text-[10px] text-gray-400 mt-1">yoki faylni sudrab keling</p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Yuklash rad etildi</p>
              <p className="text-[11px]">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Yuklanmoqda...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-700 h-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Fayl muvaffaqiyatli qabul qilindi!</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="px-3.5 py-2 text-xs font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleStartUpload}
            disabled={!selectedFile || uploading}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer ${
              !selectedFile || uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-teal-800 hover:bg-teal-900'
            }`}
          >
            {uploading ? 'Tekshirilmoqda...' : 'Tasdiqlash va Ochish'}
          </button>
        </div>
      </div>
    </div>
  );
};
