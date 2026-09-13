import React, { useState } from 'react';
import { AIProvider, AIImageGeneration } from '../../types';
import { db } from '../../utils/storage';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { generateAIImage } from '../../utils/ai';
import { Aperture, RefreshCw, Image as ImageIcon, Download, ChevronDown } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { Button, Textarea, Select, EmptyState, Screen, useToast } from '../ui';

interface ImageStudioViewProps {
  providers: AIProvider[];
  images: AIImageGeneration[];
  onUpdateImages: (images: AIImageGeneration[]) => void;
  onGoToProviders: () => void;
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({
  providers,
  images,
  onUpdateImages,
  onGoToProviders,
}) => {
  const toast = useToast();

  const activeProvider = providers.find(p => p.isActive) || providers[0];

  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageStyle, setImageStyle] = useState('vivid');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [selectedImgLightbox, setSelectedImgLightbox] = useState<AIImageGeneration | null>(null);
  const [galleryBatch, setGalleryBatch] = useState(3);
  const GALLERY_BATCH_SIZE = 12;

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImg) return;
    if (!activeProvider?.apiKey) {
      toast.warn('请先在「模型配置」中配置 OpenAI 或兼容厂商的 API Key');
      onGoToProviders();
      return;
    }

    setIsGeneratingImg(true);
    sound.playTap();

    try {
      const generated = await generateAIImage({
        provider: activeProvider,
        prompt: imagePrompt.trim(),
        size: imageSize,
        style: imageStyle,
      });

      // Cap the gallery: base64 payloads are heavy for localStorage,
      // keep only the most recent MAX_IMAGES generations.
      const MAX_IMAGES = 30;
      const updated = [generated, ...images].slice(0, MAX_IMAGES);
      onUpdateImages(updated);
      db.saveAIImages(updated);
      sound.playSuccess();
      setImagePrompt('');
    } catch (err: any) {
      toast.error(`生图失败：${err.message}`);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  return (
    <Screen className="max-w-3xl mx-auto w-full">
      {/* Prompt Generator Card */}
      <div className="bg-surface rounded-2xl border border-line shadow-elev-1 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Aperture className="w-4 h-4 text-accent shrink-0" />
            <h4 className="text-headline font-bold text-ink truncate">DALL-E 3 高清画卷生图</h4>
          </div>
          <span className="text-caption text-ink-3 shrink-0">1024×1024 · 超高清渲染</span>
        </div>

        <Textarea
          rows={3}
          placeholder="描述你想要的画面，例如：一只戴着苹果耳机的毛茸茸小猫咪坐在桌前写代码，窗外是阳光，柔和的3D皮克斯动画风格…"
          value={imagePrompt}
          onChange={e => setImagePrompt(e.target.value)}
        />

        {/* Style & Size Controls */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          <div className="relative">
            <Select
              value={imageSize}
              onChange={e => setImageSize(e.target.value)}
              className="pr-8 cursor-pointer font-medium"
              aria-label="选择图片尺寸"
            >
              <option value="1024x1024">方图 1:1</option>
              <option value="1024x1792">竖屏 9:16</option>
              <option value="1792x1024">横屏 16:9</option>
            </Select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <Select
              value={imageStyle}
              onChange={e => setImageStyle(e.target.value)}
              className="pr-8 cursor-pointer font-medium"
              aria-label="选择图片风格"
            >
              <option value="vivid">生动艺术 (Vivid)</option>
              <option value="natural">自然写实 (Natural)</option>
            </Select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleGenerateImage}
            disabled={isGeneratingImg || !imagePrompt.trim()}
            className="col-span-2 sm:col-span-1"
            haptic="medium"
          >
            {isGeneratingImg ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>正在绘制灵感…</span>
              </>
            ) : (
              <>
                <Aperture className="w-4 h-4" />
                <span>开始生图</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generated Gallery */}
      <div className="mt-4">
        <h5 className="text-caption font-semibold text-ink-3 tracking-wide px-1 mb-2.5 select-none">
          生成画廊 ({images.length})
        </h5>

        {images.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="画廊还是空白"
            hint="写下灵感提示词，生成你的第一张大作吧"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {images.slice(0, galleryBatch * GALLERY_BATCH_SIZE).map(img => (
              <button
                key={img.id}
                onClick={() => setSelectedImgLightbox(img)}
                className="group relative rounded-2xl overflow-hidden border border-line shadow-elev-1 cursor-pointer bg-surface-2 aspect-square tactile-press text-left"
                title="点击查看大图"
              >
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy" decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                  <p className="line-clamp-2 text-caption text-white leading-tight">{img.prompt}</p>
                </div>
              </button>
            ))}
            {images.length > galleryBatch * GALLERY_BATCH_SIZE && (
              <button
                onClick={() => setGalleryBatch(b => b + 1)}
                className="col-span-full w-full py-3 text-caption font-semibold text-ink-2 bg-surface border border-line rounded-2xl tactile-press"
              >
                加载更多（共 {images.length} 张）
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox BottomSheet */}
      <BottomSheet
        isOpen={!!selectedImgLightbox}
        onClose={() => setSelectedImgLightbox(null)}
        title="大图预览"
        subtitle={selectedImgLightbox?.prompt ? (selectedImgLightbox.prompt.slice(0, 32) + '…') : ''}
        maxHeight="max-h-[92dvh]"
        footer={
          selectedImgLightbox && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  setImagePrompt(selectedImgLightbox.prompt);
                  setSelectedImgLightbox(null);
                  sound.playTap();
                  haptics.impactLight();
                }}
              >
                <Aperture className="w-3.5 h-3.5" />
                <span>复用此提示词</span>
              </Button>

              <a
                href={selectedImgLightbox.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full bg-accent text-white text-caption font-semibold shadow-glow-accent tactile-press select-none whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>查看/下载原图</span>
              </a>
            </div>
          )
        }
      >
        {selectedImgLightbox && (
          <div className="space-y-3 pb-2">
            <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/90 p-1">
              <img
                src={selectedImgLightbox.imageUrl}
                alt={selectedImgLightbox.prompt}
                className="max-h-[50dvh] w-full object-contain rounded-xl"
              />
            </div>
            <div className="p-3 bg-surface-2/70 rounded-2xl border border-line/60">
              <div className="text-caption text-ink-3 font-semibold mb-1">生图提示词 (Prompt)</div>
              <p className="text-sub text-ink-2 leading-relaxed select-text">
                {selectedImgLightbox.prompt}
              </p>
            </div>
          </div>
        )}
      </BottomSheet>
    </Screen>
  );
};
