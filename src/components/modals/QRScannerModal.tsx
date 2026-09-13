import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Clipboard,
  X,
  Flashlight,
  RefreshCw,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { decodeQRFromCanvas, parseTwoFactorQR, ParsedTwoFactor } from '../../utils/qr';
import { sound } from '../../utils/sound';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (result: ParsedTwoFactor) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<ParsedTwoFactor | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsTorchOn(false);
  }, []);

  // Handle successful QR code decode
  const handleSuccessfulDecode = useCallback(async (result: ParsedTwoFactor) => {
    stopCamera();
    setScanError(null);
    sound.playSuccess();
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      /* decoration only */
    }

    setScannedResult(result);
  }, [stopCamera]);

  // Frame tick loop
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || scannedResult) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const qrText = decodeQRFromCanvas(canvas);

        if (qrText) {
          const parsed = parseTwoFactorQR(qrText);
          if (parsed && parsed.secret) {
            handleSuccessfulDecode(parsed);
            return;
          }
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(tick);
  }, [handleSuccessfulDecode, scannedResult]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScanError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('当前运行环境不支持直接调用摄像头，请使用【相册图片识别】或【剪贴板识别】');
      setScanMode('upload');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        const track = stream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));

        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('摄像头访问权限已被拒绝。请在系统设置中允许相机权限，或直接上传截图识别。');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('未检测到可用的摄像头硬件设备，已自动切换为【相册图片与截图识别】。');
      } else {
        setCameraError('无法启动摄像头 (' + (err.message || err.name) + ')，建议使用【图片识别】。');
      }
      setScanMode('upload');
    }
  }, [facingMode, stopCamera, tick]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const next = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setIsTorchOn(next);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Switch Facing Mode (User vs Environment)
  const toggleFacingMode = () => {
    sound.playTap();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };
  const toggleCameraFacing = toggleFacingMode;

  // Manual File Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImageFile(file);
    e.target.value = '';
  };

  const processImageFile = (file: File) => {
    setIsProcessingImage(true);
    setScanError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setScanError('无法初始化图片画布渲染器');
            return;
          }
          ctx.drawImage(img, 0, 0);
          const qrText = decodeQRFromCanvas(canvas);

          if (!qrText) {
            setScanError('未能从该图片中识别出清晰的二维码，请确保图片完整或尝试截屏放大');
            sound.playTap();
            return;
          }

          const parsed = parseTwoFactorQR(qrText);
          if (!parsed || !parsed.secret) {
            setScanError(`识别到内容，但不是合法的 2FA (TOTP) 格式: ${qrText.slice(0, 40)}...`);
            sound.playTap();
            return;
          }

          handleSuccessfulDecode(parsed);
        } catch (err: any) {
          setScanError('二维码解析失败: ' + err.message);
        } finally {
          setIsProcessingImage(false);
        }
      };
      img.onerror = () => {
        setScanError('加载图片失败，请检查文件格式');
        setIsProcessingImage(false);
      };
      img.src = evt.target?.result as string;
    };
    reader.onerror = () => {
      setScanError('读取图片文件失败');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Read clipboard image directly
  const handleClipboardScan = async () => {
    sound.playTap();
    setScanError(null);
    setIsProcessingImage(true);

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().startsWith('otpauth://')) {
            const parsed = parseTwoFactorQR(text.trim());
            if (parsed && parsed.secret) {
              handleSuccessfulDecode(parsed);
              return;
            }
          }
        } catch {
          // ignore text read failure
        }
      }

      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const file = new File([blob], 'clipboard_image.png', { type: imageType });
              processImageFile(file);
              return;
            }
          }
        } catch (e) {
          console.warn('Clipboard read items failed or timed out:', e);
        }
      }

      setScanError('剪贴板中未检测到 2FA 二维码截图或 otpauth:// 链接');
    } catch (err: any) {
      setScanError('读取剪贴板失败: ' + err.message);
    } finally {
      setIsProcessingImage(false);
    }
  };

  useEffect(() => {
    if (isOpen && scanMode === 'camera' && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode, facingMode, scannedResult, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target && e.currentTarget && e.target === e.currentTarget) {
          sound.playTap();
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[70] flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div className="w-full max-w-md bg-white dark:bg-surface-2 rounded-3xl shadow-ios-modal border border-line dark:border-line overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="p-3.5 border-b border-line dark:border-line flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-accent text-white shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink dark:text-zinc-100">
                扫码添加 2FA 双重身份验证
              </h3>
              <p className="text-caption text-ink-3">
                支持摄像头实时扫描、本地相册截图识别与剪贴板识别
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playTap();
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-ink-3 hover:bg-surface-2 dark:hover:bg-surface-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        {!scannedResult && (
          <div className="px-4 pt-3 flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setScanMode('camera');
                setScanError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                scanMode === 'camera'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface-2 text-ink-2 hover:text-ink'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>摄像头实时扫码</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setScanMode('upload');
                setScanError(null);
                stopCamera();
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition ${
                scanMode === 'upload'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface-2 text-ink-2 hover:text-ink'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>相册 / 图片识别</span>
            </button>
          </div>
        )}

        {/* Body Area */}
        <div className="p-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {scannedResult ? (
            /* Scanned Result Confirmation Card */
            <div className="space-y-3 animate-fade-in">
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200 dark:border-green-800/60 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-bold">成功识别 2FA 动态令牌！</span>
                </div>

                <div className="space-y-1.5 text-xs bg-white/80 dark:bg-surface-2/80 p-3 rounded-xl border border-green-100 dark:border-green-900/40">
                  <div className="flex justify-between">
                    <span className="text-ink-3">发行平台 (Issuer):</span>
                    <span className="font-bold text-ink">{scannedResult.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-3">账号标识 (Account):</span>
                    <span className="font-medium text-ink-2">{scannedResult.account}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-line">
                    <span className="text-ink-3">Base32 密钥:</span>
                    <span className="font-mono text-caption text-green-600 dark:text-green-400 font-semibold truncate max-w-[180px]">
                      {scannedResult.secret}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setScannedResult(null);
                    setScanError(null);
                    if (scanMode === 'camera') startCamera();
                  }}
                  className="py-2.5 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-ink-2 text-xs font-semibold transition"
                >
                  重新扫描
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    onScanSuccess(scannedResult);
                    onClose();
                  }}
                  className="py-2.5 rounded-xl bg-accent text-white text-xs font-bold shadow-md transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>确认添加到保险箱</span>
                </button>
              </div>
            </div>
          ) : scanMode === 'camera' ? (
            /* Live Camera Viewfinder */
            <div className="space-y-3">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-line dark:border-line shadow-inner">
                {/* Live Video */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />

                {/* Hidden Canvas for QR frame processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Viewfinder Overlay Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-56 h-56 border border-white/30 rounded-2xl overflow-hidden">
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-xl" />

                    {/* Laser Scan Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_8px_var(--theme-accent)] animate-qr-scan" />
                  </div>
                </div>

                {/* Camera Quick Action Pills */}
                <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-10">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-full backdrop-blur-md transition ${
                        isTorchOn ? 'bg-amber-400 text-ink' : 'bg-black/50 text-white hover:bg-black/70'
                      }`}
                      title={isTorchOn ? '关闭手电筒' : '打开手电筒'}
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition"
                    title="翻转镜头"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Hint badge */}
                <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-caption text-white/90 font-medium">
                    将 2FA 二维码置于框内，自动识别
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
          ) : (
            /* Upload / Clipboard Image Scanner Area */
            <div className="space-y-3">
              {/* Drop / Pick Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-line dark:border-line hover:border-accent dark:hover:border-accent bg-zinc-50 dark:bg-surface-2/40 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition group"
              >

                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>

                <p className="text-xs font-bold text-ink">
                  {isProcessingImage ? '正在解析二维码图片...' : '点击选择或拖放 2FA 二维码截图'}
                </p>
                <p className="text-caption text-ink-3 mt-1">
                  支持 JPG、PNG、WEBP、手机相册保存的照片或网页截屏
                </p>
              </div>

              {/* Paste from Clipboard Helper */}
              <button
                type="button"
                onClick={handleClipboardScan}
                disabled={isProcessingImage}
                className="w-full py-2.5 px-3 rounded-xl bg-surface-2 hover:bg-surface-2/80 text-ink text-xs font-semibold flex items-center justify-center space-x-2 transition active:scale-95"
              >
                <Clipboard className="w-4 h-4 text-blue-500" />
                <span>从剪贴板自动识别截图或链接</span>
              </button>

              {scanError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-300 flex items-start space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{scanError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
