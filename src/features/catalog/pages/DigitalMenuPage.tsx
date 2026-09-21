import { useEffect, useState } from "react";
import { QrCode, Eye, PencilSquare, ToggleOn, ToggleOff, Grid, Trash } from "react-bootstrap-icons";
import { PageHeader, EmptyState, Badge, Button, PageLoader, ConfirmDialog } from "../../../components/ui";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import { fetchDigitalMenuThunk, saveDigitalMenuThunk, deleteDigitalMenuThunk } from "../../../middleware/digitalMenu/digitalMenu.thunk";
import DigitalMenuConfigModal from "../components/DigitalMenuConfigModal";
import DigitalMenuQrModal from "../components/DigitalMenuQrModal";
import "../styles/DigitalMenu.scss";

export default function DigitalMenuPage() {
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const { menu, loading, saving } = useAppSelector((s) => s.digitalMenu);

  const [showConfig, setShowConfig] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    dispatch(fetchDigitalMenuThunk());
  }, [dispatch]);

  const denyPerm = (permKey: string) => {
    dispatch(showPermissionDenied(
      `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
    ));
  };

  const handleCreateClick = () => {
    if (!can("create_digital_menu")) { denyPerm("create_digital_menu"); return; }
    setShowConfig(true);
  };

  const handleEditClick = () => {
    if (!can("edit_digital_menu")) { denyPerm("edit_digital_menu"); return; }
    setShowConfig(true);
  };

  const handleQrClick = () => {
    if (!can("manage_digital_menu_qr")) { denyPerm("manage_digital_menu_qr"); return; }
    setShowQr(true);
  };

  const handleToggleStatus = () => {
    if (!menu) return;
    if (!can("enable_disable_digital_menu")) { denyPerm("enable_disable_digital_menu"); return; }
    dispatch(saveDigitalMenuThunk({
      id: menu.id,
      name: menu.name,
      status: menu.status === "active" ? "inactive" : "active",
      service_selection_mode: menu.service_selection_mode,
      selected_service_ids: menu.selected_service_ids,
    }));
  };

  const handleViewMenu = () => {
    if (!menu) return;
    window.open(`${window.location.origin}/menu/${menu.public_token}`, "_blank", "noopener,noreferrer");
  };

  const handleDeleteClick = () => {
    if (!can("delete_digital_menu")) { denyPerm("delete_digital_menu"); return; }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!menu) return;
    const result = await dispatch(deleteDigitalMenuThunk(menu.id));
    if (deleteDigitalMenuThunk.fulfilled.match(result)) setShowDeleteConfirm(false);
  };

  if (loading && !menu) return <PageLoader fullHeight />;

  return (
    <div className="dm-page">
      <PageHeader
        title="Digital Menu"
        subtitle="Turn your services into a customer-facing QR menu."
      />

      {!menu ? (
        <EmptyState
          icon={<Grid size={40} />}
          title="No digital menu yet"
          description="Create a digital menu from your existing services and generate a QR code customers can scan."
          action={
            <Button variant="primary" onClick={handleCreateClick} loading={saving}>
              Create Menu
            </Button>
          }
        />
      ) : (
        <div className="dm-card">
          <div className="dm-card__top">
            <div>
              <div className="dm-card__name">{menu.name}</div>
              <Badge variant={menu.status === "active" ? "success" : "secondary"}>
                {menu.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="dm-card__stats">
              <div className="dm-card__stat">
                <span className="dm-card__stat-value">{menu.service_count}</span>
                <span className="dm-card__stat-label">Services</span>
              </div>
              <div className="dm-card__stat">
                <span className="dm-card__stat-value">{menu.category_count}</span>
                <span className="dm-card__stat-label">Categories</span>
              </div>
            </div>
          </div>

          <div className="dm-card__updated">
            Last updated {new Date(menu.updated_at).toLocaleString()}
          </div>

          <div className="dm-card__actions">
            <Button variant="outline-secondary" size="sm" iconLeft={<Eye size={14} />} onClick={handleViewMenu}>
              View Menu
            </Button>
            <Button variant="outline-secondary" size="sm" iconLeft={<QrCode size={14} />} onClick={handleQrClick}>
              QR Code
            </Button>
            <Button variant="outline-secondary" size="sm" iconLeft={<PencilSquare size={14} />} onClick={handleEditClick}>
              Edit
            </Button>
            <Button
              variant={menu.status === "active" ? "outline-danger" : "outline-success"}
              size="sm"
              iconLeft={menu.status === "active" ? <ToggleOff size={14} /> : <ToggleOn size={14} />}
              onClick={handleToggleStatus}
              loading={saving}
            >
              {menu.status === "active" ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              iconLeft={<Trash size={14} />}
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {showConfig && (
        <DigitalMenuConfigModal
          onClose={() => setShowConfig(false)}
          onSaved={() => setShowConfig(false)}
        />
      )}
      {showQr && menu && (
        <DigitalMenuQrModal menu={menu} onClose={() => setShowQr(false)} />
      )}

      {showDeleteConfirm && menu && (
        <ConfirmDialog
          title="Delete Digital Menu"
          message={(
            <>
              Are you sure you want to delete the <strong>{menu.name}</strong> digital menu? Its QR code will stop
              working immediately and this action cannot be undone.
            </>
          )}
          confirmLabel={saving ? "Deleting…" : "Delete"}
          danger
          confirmDisabled={saving}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !saving && setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
