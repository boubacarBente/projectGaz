'use client';

import { useState, useRef, useEffect } from 'react';

export async function generateInvoiceBlob(
  invoiceHTML: string,
): Promise<Blob | null> {
  try {
    const html2canvasModule = await import('html2canvas');
    const hc = html2canvasModule.default;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe');

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
    </style></head><body>${invoiceHTML}</body></html>`);
    iframeDoc.close();

    const canvas = await hc(iframeDoc.body, {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: 'rgb(255,255,255)', logging: false,
    });

    document.body.removeChild(iframe);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
  } catch (err) {
    console.error('Invoice image generation error:', err);
    return null;
  }
}

export async function shareOnWhatsApp(
  invoiceHTML: string,
  textMessage: string,
): Promise<void> {
  const blob = await generateInvoiceBlob(invoiceHTML);
  if (!blob) {
    // Fallback: open WhatsApp with text only
    window.open(`https://wa.me/?text=${encodeURIComponent(textMessage)}`, '_blank');
    return;
  }

  // Try Web Share API (mobile browsers → includes WhatsApp)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], 'facture.png', { type: 'image/png' });
    const shareData = { title: 'Facture', text: textMessage, files: [file] };
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        // User cancelled or share failed — fall through to fallback
        if (err.name !== 'AbortError') console.error('Share error:', err);
      }
    }
  }

  // Fallback: open WhatsApp Web with the image URL + text
  const blobUrl = URL.createObjectURL(blob);
  const message = `${textMessage}\n${blobUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  // Cleanup blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

interface ExportDropdownProps {
  onExportPDF: () => void;
  onExportImage: () => void;
  onShareWhatsApp?: () => void;
  compact?: boolean;
  label?: string;
}

export function ExportDropdown({ onExportPDF, onExportImage, onShareWhatsApp, compact = false, label }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={compact
          ? "btn btn-ghost btn-sm btn-square"
          : "btn btn-primary btn-sm gap-1"
        }
        title="Télécharger"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {!compact && <span className="hidden sm:inline">{label || 'Télécharger'}</span>}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-base-200 bg-base-100 shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => handleSelect(onExportPDF)}
            className="flex cursor-pointer items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-base-content hover:bg-base-200 transition-colors"
            title="Exporter en PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          <div className="border-t border-base-200" />
          <button
            type="button"
            onClick={() => handleSelect(onExportImage)}
            className="flex cursor-pointer items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-base-content hover:bg-base-200 transition-colors"
            title="Exporter en image (PNG)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image
          </button>
          {onShareWhatsApp && (
            <>
              <div className="border-t border-base-200" />
              <button
                type="button"
                onClick={() => handleSelect(onShareWhatsApp)}
                className="flex cursor-pointer items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-base-content hover:bg-base-200 transition-colors"
                title="Partager sur WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                WhatsApp
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
