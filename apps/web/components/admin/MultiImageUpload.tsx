import { ChevronLeft, ChevronRight, Loader2, Star, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { compressImage } from "@/lib/mediaCompression";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
  folder?: string;
}

/** Product gallery uploader. The first image is the main image. */
export function MultiImageUpload({
  value,
  onChange,
  max = 10,
  bucket = "product-images",
  folder = "products",
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const images = value || [];

  const uploadOne = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) return null;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`${file.name} is larger than 20MB`);
      return null;
    }
    try {
      const compressed = await compressImage(file, "product");
      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("folder", folder ? `anonna-mart/${folder}` : "anonna-mart/catalog");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(
          errJson.error || errJson.message || `Upload failed with status ${response.status}`,
        );
      }

      const res = await response.json();
      return res.data?.secure_url || res.data?.url || null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      return null;
    }
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = max - images.length;
    if (room <= 0) {
      toast.error(`You can add up to ${max} images`);
      return;
    }
    const files = Array.from(list).slice(0, room);
    if (list.length > room) toast.info(`Only ${room} more image(s) can be added`);
    setUploading(files.length);
    const urls = (await Promise.all(files.map(uploadOne))).filter(Boolean) as string[];
    setUploading(0);
    if (urls.length) {
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    }
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const makeMain = (i: number) => onChange([images[i], ...images.filter((_, idx) => idx !== i)]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2 mt-1.5">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div
            key={url + i}
            className={cn(
              "group relative aspect-square rounded-xl overflow-hidden border bg-secondary",
              i === 0
                ? "col-span-2 row-span-2 border-primary ring-2 ring-primary/20"
                : "border-border",
            )}
          >
            <img src={url} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove image"
              className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-sm hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move left"
                className="h-7 w-7 rounded-full bg-background/90 flex items-center justify-center shadow-sm disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makeMain(i)}
                  className="h-7 px-2 rounded-full bg-background/90 text-[10px] font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Star className="h-3 w-3" /> Main
                </button>
              )}
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label="Move right"
                className="h-7 w-7 rounded-full bg-background/90 flex items-center justify-center shadow-sm disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {images.length < max && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "relative aspect-square rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-muted-foreground text-center p-2 transition-colors",
              images.length === 0 && "col-span-3 sm:col-span-4 aspect-[2/1]",
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              uploading > 0 && "pointer-events-none opacity-60",
            )}
          >
            {uploading > 0 ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs mt-2">Uploading {uploading}…</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs font-medium mt-1.5">
                  {images.length === 0 ? "Click or drag images to upload" : "Add more"}
                </span>
                {images.length === 0 && (
                  <span className="text-[11px] mt-1">
                    Select several at once · first image is the main one
                  </span>
                )}
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>
      {images.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {images.length}/{max} images · the first image is shown as the main product photo
        </p>
      )}
    </div>
  );
}
