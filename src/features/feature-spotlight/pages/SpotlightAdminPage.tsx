import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Stars, PencilSquare, Trash, ImageFill, Plus, ArrowLeft, Download, Upload } from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import SpotlightFormDrawer from "../components/SpotlightFormDrawer";
import { selectSpotlightFeatures } from "../../../store/spotlightSlice";
import {
  fetchSpotlightFeaturesThunk,
  createSpotlightFeatureThunk,
  updateSpotlightFeatureThunk,
  deleteSpotlightFeatureThunk,
} from "../../../middleware/spotlight/spotlight.thunk";
import { exportFeaturesJson, importFeaturesJson } from "../utils/spotlightStorage";
import type { SpotlightFeature, SpotlightCreatePayload } from "../types";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import "../styles/Spotlight.scss";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function SpotlightAdminPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const features = useAppSelector(selectSpotlightFeatures);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SpotlightFeature | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchSpotlightFeaturesThunk());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSaveError("");
    setDrawerOpen(true);
  };

  const openEdit = (feature: SpotlightFeature) => {
    setEditing(feature);
    setSaveError("");
    setDrawerOpen(true);
  };

  const handleSave = async (payload: SpotlightCreatePayload) => {
    const result = editing
      ? await dispatch(updateSpotlightFeatureThunk({ id: editing.id, data: payload }))
      : await dispatch(createSpotlightFeatureThunk(payload));

    if (updateSpotlightFeatureThunk.rejected.match(result) || createSpotlightFeatureThunk.rejected.match(result)) {
      const message = result.payload ?? "Failed to save. The image/video file may be too large for local storage — try a smaller file.";
      setSaveError(message);
      return;
    }

    setSaveError("");
    setDrawerOpen(false);
    setEditing(null);
  };

  // Spotlight has no backend yet — localStorage is scoped per browser +
  // origin, so an image uploaded on localhost never appears on a deployed
  // environment. Export/Import moves the whole dataset (features + embedded
  // images) between environments as one JSON file instead of re-uploading
  // each image by hand on every environment.
  const handleExport = () => {
    const json = exportFeaturesJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spotlight-features-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const imported = await importFeaturesJson(text);
      await dispatch(fetchSpotlightFeaturesThunk());
      setImportMessage({ type: "success", text: `Imported ${imported.length} feature(s) into this browser.` });
    } catch (err) {
      setImportMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to import file." });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleteLoading(true);
    const result = await dispatch(deleteSpotlightFeatureThunk(pendingDeleteId));
    setDeleteLoading(false);

    if (deleteSpotlightFeatureThunk.rejected.match(result)) {
      setDeleteError(result.payload || "Failed to delete this feature. Please try again.");
      return;
    }

    setDeleteError("");
    setPendingDeleteId(null);
    setDeleteInput("");
  };

  return (
    <div className="spotlight-page">
      <div className="spotlight-page__header">
        <div className="spotlight-page__icon">
          <Stars size={20} />
        </div>
        <div>
          <h1 className="spotlight-page__title">Spotlight Features</h1>
          <p className="spotlight-page__subtitle">
            Create and publish announcements for new SalonOX features.
          </p>
        </div>
      </div>

      <div className="spotlight-admin__toolbar">
        <Button variant="outline-dark" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate("/dashboard/spotlight")}>
          Back to Spotlight
        </Button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "#667085" }}>{features.length} feature{features.length === 1 ? "" : "s"}</span>
          <Button variant="outline-dark" size="sm" iconLeft={<Download size={13} />} onClick={handleExport}>
            Export
          </Button>
          <Button variant="outline-dark" size="sm" iconLeft={<Upload size={13} />} onClick={handleImportClick} loading={importing}>
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          <Button variant="primary" iconLeft={<Plus size={16} />} onClick={openCreate}>
            New Feature
          </Button>
        </div>
      </div>

      {importMessage && (
        <div className={importMessage.type === "error" ? "sf-error" : "spotlight-import-success"} style={{ marginBottom: 16 }}>
          {importMessage.text}
        </div>
      )}

      <div className="spotlight-admin__table-wrap">
        {features.length === 0 ? (
          <div className="spotlight-empty">No Spotlight features yet — create your first one.</div>
        ) : (
          features.map((feature) => (
            <div className="spotlight-admin__row" key={feature.id}>
              <div className="spotlight-admin__row-thumb">
                {feature.imageDataUrl ? (
                  <img src={resolveMediaUrl(feature.imageDataUrl)} alt={feature.featureName} />
                ) : (
                  <ImageFill size={18} />
                )}
              </div>
              <div className="spotlight-admin__row-body">
                <div className="spotlight-admin__row-name">{feature.featureName}</div>
                <div className="spotlight-admin__row-meta">
                  {feature.module} · Released {formatDate(feature.releaseDate)}
                </div>
              </div>
              <span className={`spotlight-pill spotlight-pill--${feature.status}`}>
                {feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
              </span>
              <div className="spotlight-admin__row-actions">
                <Button variant="outline-dark" size="sm" iconLeft={<PencilSquare size={13} />} onClick={() => openEdit(feature)}>
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  iconLeft={<Trash size={13} />}
                  onClick={() => { setPendingDeleteId(feature.id); setDeleteInput(""); setDeleteError(""); }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {drawerOpen && (
        <SpotlightFormDrawer
          feature={editing}
          externalError={saveError}
          onClose={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      <Modal
        show={!!pendingDeleteId}
        onClose={() => { setPendingDeleteId(null); setDeleteInput(""); setDeleteError(""); }}
        title="Delete Spotlight feature?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || deleteLoading}
              loading={deleteLoading}
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => { setPendingDeleteId(null); setDeleteInput(""); setDeleteError(""); }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        {deleteError && <div className="sf-error mb-3">{deleteError}</div>}
        <p className="text-muted small mb-4">
          This will permanently remove the feature announcement. This action cannot be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>
    </div>
  );
}
