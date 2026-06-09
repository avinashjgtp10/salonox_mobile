import React, { useRef, useState, useCallback } from "react";
import { CloudArrowUp, XCircleFill, ZoomIn } from "react-bootstrap-icons";
import type { PortfolioData, PortfolioImage } from "../../types/catalog.types.ts";

interface Props {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

const MAX_MB = 10;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PortfolioImagesTab: React.FC<Props> = ({ data, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const createdUrlsRef = useRef<Set<string>>(new Set());

  // Revoke any tracked blob URL that is no longer present in the images array
  React.useEffect(() => {
    const currentBlobUrls = new Set(
      data.images.map((img) => img.url).filter((url) => url.startsWith("blob:"))
    );

    createdUrlsRef.current.forEach((url) => {
      if (!currentBlobUrls.has(url)) {
        URL.revokeObjectURL(url);
        createdUrlsRef.current.delete(url);
      }
    });

    currentBlobUrls.forEach((url) => {
      createdUrlsRef.current.add(url);
    });
  }, [data.images]);

  // Clean up all blob URLs when the component unmounts
  React.useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      createdUrlsRef.current.clear();
    };
  }, []);

  const processFiles = useCallback(
    (files: File[]) => {
      const errs: string[] = [];
      const valid: PortfolioImage[] = [];

      files.forEach((file) => {
        if (!ACCEPT.includes(file.type)) {
          errs.push(`"${file.name}" is not a supported image type.`);
          return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          errs.push(`"${file.name}" exceeds ${MAX_MB}MB.`);
          return;
        }
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.add(url);
        valid.push({
          id: crypto.randomUUID(),
          url,
          file,
        });
      });

      setErrors(errs);
      if (valid.length) {
        onChange({ ...data, images: [...data.images, ...valid] });
      }
    },
    [data, onChange],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (id: string) => {
    const img = data.images.find((i) => i.id === id);
    if (img?.url && img.url.startsWith("blob:")) {
      URL.revokeObjectURL(img.url);
      createdUrlsRef.current.delete(img.url);
    }
    onChange({ ...data, images: data.images.filter((i) => i.id !== id) });
  };

  return (
    <div className="tab-content-panel">
      <div className="pi-header">
        <div>
          <h5 className="tab-content-panel__title mb-1">Portfolio Images</h5>
          <p className="pi-sub">Upload before/after or example images for this service.</p>
        </div>
        {data.images.length > 0 && (
          <button className="pi-add-more" onClick={() => fileInputRef.current?.click()}>
            <CloudArrowUp size={14} /> Add more
          </button>
        )}
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="pi-errors">
          {errors.map((e, i) => (
            <div key={i} className="pi-error-item">⚠ {e}</div>
          ))}
          <button className="pi-error-close" onClick={() => setErrors([])}>✕</button>
        </div>
      )}

      {/* Drop zone — only show when no images yet */}
      {data.images.length === 0 && (
        <div
          className={`pi-dropzone${dragging ? " pi-dropzone--active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="pi-dropzone__icon">
            <CloudArrowUp size={32} />
          </div>
          <p className="pi-dropzone__text">
            {dragging ? "Drop to upload" : "Click or drag images here to upload"}
          </p>
          <p className="pi-dropzone__hint">PNG, JPG, WEBP · up to {MAX_MB}MB each</p>
        </div>
      )}

      {/* Image grid */}
      {data.images.length > 0 && (
        <>
          <div className="pi-grid">
            {data.images.map((img) => (
              <div key={img.id} className="pi-thumb">
                <img src={img.url} alt="" draggable={false} />
                <div className="pi-thumb__overlay">
                  <button
                    className="pi-thumb__action pi-thumb__action--zoom"
                    onClick={() => setPreview(img.url)}
                    title="Preview"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    className="pi-thumb__action pi-thumb__action--remove"
                    onClick={() => removeImage(img.id)}
                    title="Remove"
                  >
                    <XCircleFill size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Inline add tile */}
            <div
              className={`pi-thumb pi-thumb--add${dragging ? " pi-dropzone--active" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <CloudArrowUp size={20} />
              <span>Add</span>
            </div>
          </div>
          <p className="pi-count">{data.images.length} image{data.images.length !== 1 ? "s" : ""} · PNG, JPG up to {MAX_MB}MB each</p>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="d-none"
        onChange={handleFileChange}
      />

      {/* Lightbox */}
      {preview && (
        <div className="pi-lightbox" onClick={() => setPreview(null)}>
          <img src={preview} alt="preview" onClick={(e) => e.stopPropagation()} />
          <button className="pi-lightbox__close" onClick={() => setPreview(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default PortfolioImagesTab;
