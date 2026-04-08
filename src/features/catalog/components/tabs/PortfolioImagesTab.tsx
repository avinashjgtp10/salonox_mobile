import React, { useRef } from "react";
import type {
  PortfolioData,
  PortfolioImage,
} from "../../types/catalog.types.ts";

interface Props {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

const PortfolioImagesTab: React.FC<Props> = ({ data, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((file: File) => ({
      id: Math.random().toString(36).slice(2),
      url: URL.createObjectURL(file),
      file,
    }));
    onChange({ ...data, images: [...data.images, ...newPreviews] });
  };

  return (
    <div className="tab-content-panel">
      <h5 className="tab-content-panel__title">Portfolio Images</h5>
      <p className="text-muted mb-3">
        Upload before/after or example images for this service.
      </p>
      <div
        className="portfolio-upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
        <i className="bi bi-image fs-2 text-muted" />
        <p className="mt-2 mb-0 text-muted">
          Click or drag images here to upload
        </p>
        <small className="text-muted">PNG, JPG up to 10MB each</small>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="d-none"
          onChange={handleFileChange}
        />
      </div>
      {data.images.length > 0 && (
        <div className="portfolio-images-grid mt-3">
          {data.images.map((img: PortfolioImage) => (
            <div key={img.id} className="portfolio-image-item">
              <img src={img.url} alt="portfolio" />
              <button
                className="portfolio-image-remove"
                onClick={() =>
                  onChange({
                    ...data,
                    images: data.images.filter(
                      (i: PortfolioImage) => i.id !== img.id,
                    ),
                  })
                }
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioImagesTab;
