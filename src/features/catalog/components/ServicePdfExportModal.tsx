import React, { useState } from "react";
import { X, FileEarmarkPdf, Table, ListTask, CheckCircleFill } from "react-bootstrap-icons";
import "../styles/ServicePdfExportModal.scss";

interface Props {
  serviceCount: number;
  onClose: () => void;
  onExport: (mode: "summary" | "detailed") => void;
}

const ServicePdfExportModal: React.FC<Props> = ({ serviceCount, onClose, onExport }) => {
  const [selectedMode, setSelectedMode] = useState<"summary" | "detailed">("summary");

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pdf-modal__header">
          <div className="pdf-modal__title-box">
            <div className="pdf-modal__icon">
              <FileEarmarkPdf size={20} />
            </div>
            <div>
              <h3 className="pdf-modal__title">Export Service Catalog PDF</h3>
              <p className="pdf-modal__subtitle">
                Exporting <strong>{serviceCount}</strong> currently filtered service{serviceCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
          <button className="pdf-modal__close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="pdf-modal__body">
          <p className="pdf-modal__section-label">Select Export Format</p>

          <div className="pdf-modal__options-grid">
            {/* Summary Option */}
            <div
              className={`pdf-modal__card ${selectedMode === "summary" ? "pdf-modal__card--active" : ""}`}
              onClick={() => setSelectedMode("summary")}
            >
              <div className="pdf-modal__card-header">
                <div className="pdf-modal__card-icon">
                  <Table size={18} />
                </div>
                <div className="pdf-modal__card-info">
                  <h4>Summary PDF</h4>
                  <span className="pdf-modal__badge">Standard View</span>
                </div>
                {selectedMode === "summary" && (
                  <CheckCircleFill size={18} className="pdf-modal__check" />
                )}
              </div>
              <p className="pdf-modal__card-desc">
                Includes header branding, summary KPIs, and a structured service table with category, duration, price, GST, and status. Best for printing and quick staff reference.
              </p>
            </div>

            {/* Detailed Option */}
            <div
              className={`pdf-modal__card ${selectedMode === "detailed" ? "pdf-modal__card--active" : ""}`}
              onClick={() => setSelectedMode("detailed")}
            >
              <div className="pdf-modal__card-header">
                <div className="pdf-modal__card-icon pdf-modal__card-icon--purple">
                  <ListTask size={18} />
                </div>
                <div className="pdf-modal__card-info">
                  <h4>Detailed PDF</h4>
                  <span className="pdf-modal__badge pdf-modal__badge--purple">Consultation View</span>
                </div>
                {selectedMode === "detailed" && (
                  <CheckCircleFill size={18} className="pdf-modal__check" />
                )}
              </div>
              <p className="pdf-modal__card-desc">
                Includes header branding, summary KPIs, and detailed card blocks for every service showing full descriptions, prices, durations & GST. Ideal for client consultation.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-modal__footer">
          <button className="pdf-modal__btn pdf-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pdf-modal__btn pdf-modal__btn--primary"
            onClick={() => onExport(selectedMode)}
          >
            <FileEarmarkPdf size={15} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicePdfExportModal;
