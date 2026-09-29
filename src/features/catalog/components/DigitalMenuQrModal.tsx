import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Download, Printer, Link45deg, Share } from "react-bootstrap-icons";
import { Modal, Button } from "../../../components/ui";
import { makeQrDataUri } from "../../settings/designer/core/codes";
import { renderQrPoster } from "../utils/digitalMenuQrPoster";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import type { DigitalMenu } from "../types/digitalMenu.types";
import "../styles/DigitalMenu.scss";

interface Props {
  menu: DigitalMenu;
  onClose: () => void;
}

function buildPublicMenuUrl(token: string): string {
  return `${window.location.origin}/menu/${token}`;
}

const DigitalMenuQrModal: React.FC<Props> = ({ menu, onClose }) => {
  const publicUrl = buildPublicMenuUrl(menu.public_token);
  const [qrDataUri, setQrDataUri] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const currentSalon = useAppSelector((s: any) => s.salon?.currentSalon ?? null);

  useEffect(() => {
    let cancelled = false;
    makeQrDataUri(publicUrl).then((uri) => { if (!cancelled) setQrDataUri(uri); });
    return () => { cancelled = true; };
  }, [publicUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Menu link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const handleDownload = async () => {
    if (!qrDataUri || downloading) return;
    setDownloading(true);
    try {
      const posterDataUri = await renderQrPoster({
        salonName: currentSalon?.business_name || "Our Salon",
        logoUrl: resolveMediaUrl(currentSalon?.logo_url),
        qrDataUri,
        serviceCount: menu.service_count,
        categoryCount: menu.category_count,
      });
      const a = document.createElement("a");
      a.href = posterDataUri;
      a.download = `${menu.name.replace(/\s+/g, "-").toLowerCase()}-qr-poster.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Couldn't generate the QR poster");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!qrDataUri) return;
    const win = window.open("", "_blank", "width=480,height=680");
    if (!win) return;
    try {
      const posterDataUri = await renderQrPoster({
        salonName: currentSalon?.business_name || "Our Salon",
        logoUrl: resolveMediaUrl(currentSalon?.logo_url),
        qrDataUri,
        serviceCount: menu.service_count,
        categoryCount: menu.category_count,
      });
      win.document.write(`
        <html>
          <head><title>${menu.name} — QR Code</title></head>
          <body style="text-align:center;margin:0;padding:24px;">
            <img src="${posterDataUri}" style="width:100%;max-width:420px;" />
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch {
      win.close();
      toast.error("Couldn't generate the QR poster");
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: menu.name, url: publicUrl });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  return (
    <Modal show onClose={onClose} title="Digital Menu QR Code" size="sm">
      <div className="dm-qr">
        <div className="dm-qr__name">{menu.name}</div>

        <div className="dm-qr__code">
          {qrDataUri ? (
            <img src={qrDataUri} alt="Digital menu QR code" />
          ) : (
            <div className="dm-qr__code-loading">Generating…</div>
          )}
        </div>

        <p className="dm-qr__hint">Scan this QR code to view the menu.</p>
        <div className="dm-qr__url">{publicUrl}</div>

        <div className="dm-qr__actions">
          <Button
            variant="outline-secondary"
            size="sm"
            iconLeft={<Download size={14} />}
            onClick={handleDownload}
            disabled={downloading || !qrDataUri}
          >
            {downloading ? "Preparing…" : "Download"}
          </Button>
          <Button variant="outline-secondary" size="sm" iconLeft={<Printer size={14} />} onClick={handlePrint}>
            Print
          </Button>
          <Button variant="outline-secondary" size="sm" iconLeft={<Link45deg size={14} />} onClick={handleCopyLink}>
            Copy Link
          </Button>
          {typeof navigator !== "undefined" && !!navigator.share && (
            <Button variant="outline-secondary" size="sm" iconLeft={<Share size={14} />} onClick={handleShare}>
              Share
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DigitalMenuQrModal;
