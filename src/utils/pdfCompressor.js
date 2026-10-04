import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import jsPDF from 'jspdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const COMPRESSION_PROFILES = {
  high: { label: 'Alta Calidad', scale: 2.0, quality: 0.9 },
  medium: { label: 'Calidad Media', scale: 1.5, quality: 0.6 },
  low: { label: 'Baja Calidad (Máx. compresión)', scale: 1.0, quality: 0.3 }
};

export const compressPDF = async (file, profile, onProgress) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress((i / numPages) * 100);
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: profile.scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    const imgData = canvas.toDataURL('image/jpeg', profile.quality);
    
    // Scale back to original page size in pt for jsPDF
    const originalViewport = page.getViewport({ scale: 1.0 });
    const widthPt = originalViewport.width;
    const heightPt = originalViewport.height;

    // Adjust orientation if needed
    const orientation = widthPt > heightPt ? 'l' : 'p';
    
    if (i === 1) {
      doc.setProperties({ title: file.name });
      // Remove default page if dimensions are different
      doc.deletePage(1);
    }
    
    doc.addPage([widthPt, heightPt], orientation);
    doc.addImage(imgData, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');
  }

  const blob = doc.output('blob');
  return blob;
};

export const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
