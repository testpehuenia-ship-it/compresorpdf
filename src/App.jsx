import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Download, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { compressPDF, COMPRESSION_PROFILES, formatSize } from './utils/pdfCompressor';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }
    setFile(selectedFile);
    processPDF(selectedFile);
  };

  const processPDF = async (pdfFile) => {
    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const generatedResults = [];
      const profiles = Object.entries(COMPRESSION_PROFILES);
      
      let currentStep = 0;
      const totalSteps = profiles.length * 100;

      for (const [key, profile] of profiles) {
        const onProgress = (p) => {
          setProgress(((currentStep + p) / totalSteps) * 100);
        };
        
        // Yield to browser to prevent UI freeze
        await new Promise(r => setTimeout(r, 50));
        
        const blob = await compressPDF(pdfFile, profile, onProgress);
        currentStep += 100;
        
        const url = URL.createObjectURL(blob);
        generatedResults.push({
          key,
          label: profile.label,
          size: blob.size,
          url,
          savings: pdfFile.size > 0 ? ((pdfFile.size - blob.size) / pdfFile.size) * 100 : 0
        });
      }

      setResults({
        originalSize: pdfFile.size,
        options: generatedResults
      });
    } catch (error) {
      console.error(error);
      alert('Hubo un error al procesar el PDF. ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
  };

  const getSavingClass = (savings) => {
    if (savings > 50) return 'saving-success';
    if (savings > 20) return 'saving-warning';
    if (savings < 0) return 'saving-danger';
    return '';
  };

  return (
    <>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <div className="container">
        <header>
          <h1>PDF Compressor Pro</h1>
          <p className="subtitle">Comprime tus PDFs al instante sin perder calidad visual</p>
        </header>

        <main className="glass-panel">
          {!isProcessing && !results && (
            <div 
              className="dropzone fade-in"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="icon" />
              <h3>Arrastra tu PDF aquí</h3>
              <p>O haz clic para seleccionar un archivo desde tu dispositivo</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInput} 
                accept="application/pdf"
                style={{ display: 'none' }} 
              />
            </div>
          )}

          {isProcessing && (
            <div className="loading-container fade-in">
              <RefreshCw className="icon" style={{ animation: 'spin 2s linear infinite', color: 'var(--primary)', width: 48, height: 48 }} />
              <h3>Procesando y comprimiendo...</h3>
              <p style={{ color: 'var(--text-muted)' }}>Optimizando para 3 niveles de calidad</p>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {results && (
            <div className="results fade-in">
              <div className="results-header">
                <div className="original-info">
                  <FileText style={{ color: 'var(--text-muted)' }} />
                  <span>Original: {file?.name} ({formatSize(results.originalSize)})</span>
                </div>
                <button className="reset-btn" onClick={reset}>
                  Comprimir otro archivo
                </button>
              </div>

              <div className="options-grid">
                {results.options.map((option) => (
                  <div className="option-card fade-in" key={option.key}>
                    <div className="option-header">
                      {option.key === 'high' ? <CheckCircle size={20} color="var(--success)"/> : 
                       option.key === 'low' ? <AlertTriangle size={20} color="var(--warning)"/> : 
                       <CheckCircle size={20} color="var(--primary)"/>}
                      <span>{option.label}</span>
                    </div>
                    
                    <div className="option-size">
                      {formatSize(option.size)}
                    </div>
                    
                    <div className={`option-saving ${option.savings > 0 ? 'saving-high' : 'saving-low'}`}>
                      {option.savings > 0 
                        ? `Ahorras ${option.savings.toFixed(1)}%` 
                        : `El tamaño aumentó (poco texto/vector)`}
                    </div>

                    <a 
                      href={option.url} 
                      download={`comprimido_${option.key}_${file?.name}`}
                      className="download-btn"
                    >
                      <Download size={18} />
                      Descargar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
