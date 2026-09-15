import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Download, Printer, Link45deg, Share } from "react-bootstrap-icons";
import { Modal, Button } from "../../../components/ui";
import { makeQrDataUri } from "../../settings/designer/core/codes";
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

  const handleDownload = () => {
    if (!qrDataUri) return;
    const a = document.createElement("a");
    a.href = qrDataUri;
    a.download = `${menu.name.replace(/\s+/g, "-").toLowerCase()}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrint = () => {
    if (!qrDataUri) return;
    const win = window.open("", "_blank", "width=480,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${menu.name} — QR Code</title></head>
        <body style="text-align:center;font-family:sans-serif;padding:32px;">
          <h2>${menu.name}</h2>
          <img src="${qrDataUri}" style="width:280px;height:280px;" />
          <p>Scan this QR code to view the menu.</p>
          <p style="color:#666;font-size:12px;">${publicUrl}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
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
          <Button variant="outline-secondary" size="sm" iconLeft={<Download size={14} />} onClick={handleDownload}>
            Download
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
