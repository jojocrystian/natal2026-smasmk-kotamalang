import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer environment / back camera on smartphones
          const backCam = devices.find(d => /back|rear|environment|belakang/i.test(d.label));
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startScanning(chosenId);
        } else {
          setError('Tidak ada kamera yang terdeteksi di perangkat ini.');
        }
      })
      .catch((err) => {
        setError('Izin akses kamera diperlukan. Pastikan izin kamera telah diberikan di browser.');
      });

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async (cameraId) => {
    try {
      setError('');
      if (scannerRef.current) {
        await stopScanning();
      }

      const scanner = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.72);
            return { width: Math.max(size, 180), height: Math.max(size, 180) };
          },
          aspectRatio: window.innerWidth < 640 ? 1.0 : 1.33,
        },
        (decodedText) => {
          if (decodedText) {
            onScanSuccess(decodedText.trim());
          }
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      setError('Gagal mengakses kamera: ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Stop scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleCameraChange = async (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    await startScanning(newId);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm">Scanner QR Presensi</h3>
              <p className="text-[11px] text-slate-400">Arahkan kamera ponsel/laptop ke kode QR</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Selector Dropdown */}
        {cameras.length > 1 && (
          <div className="px-3.5 py-2 bg-slate-800/40 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="shrink-0 text-[11px] font-medium">Kamera:</span>
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 truncate"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Kamera (${c.id.slice(0, 8)}...)`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="m-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Viewport for HTML5 QR Code */}
        <div className="relative bg-black flex items-center justify-center min-h-[260px] sm:min-h-[320px] overflow-hidden flex-1">
          <div id="qr-reader-viewport" className="w-full h-full min-h-[260px] sm:min-h-[320px]" />
          
          {/* Responsive Animated Reticle */}
          {isScanning && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-48 h-48 sm:w-60 sm:h-60 border-2 border-emerald-500/40 rounded-2xl relative">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                
                {/* Scan Light Beam */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_10px_#34d399]" />
              </div>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Atau ketik ID peserta (cth: 001_Budi)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shrink-0"
            >
              Kirim
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
