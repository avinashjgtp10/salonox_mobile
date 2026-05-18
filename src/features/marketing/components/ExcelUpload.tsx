import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import "../styles/ExcelUpload.scss";

interface Contact {
  phone: string;
  name?: string;
  [key: string]: string | undefined;
}

interface Props {
  onContactsLoaded: (contacts: Contact[]) => void;
}

export default function ExcelUpload({ onContactsLoaded }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [count,    setCount]    = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [preview,  setPreview]  = useState<Contact[]>([]);

  const processFile = useCallback((file: File) => {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: false });

        if (!rows.length) { setError("Excel file is empty."); return; }

        const cols = Object.keys(rows[0]);

        const phoneCol = cols.find(c =>
          ["phone","mobile","number","whatsapp","contact","tel"].some(k => c.toLowerCase().includes(k))
        ) ?? cols[0];

        const nameCol = cols.find(c => c.toLowerCase().includes("name"));

        const contacts: Contact[] = rows.map((row: Record<string, any>) => {
          const raw    = String(row[phoneCol] ?? "").trim();
          const digits = raw.replace(/\D/g, "");
          let phone    = raw.replace(/[\s\-().]/g, "");
          if (digits.length === 10)                             phone = `+91${digits}`;
          else if (digits.length === 12 && digits.startsWith("91")) phone = `+${digits}`;
          else if (!phone.startsWith("+") && digits.length > 10)    phone = `+${digits}`;
          return {
            phone,
            name: nameCol ? String(row[nameCol] ?? "").trim() || undefined : undefined,
            ...Object.fromEntries(cols.map((c: string) => [c, String(row[c] ?? "")])),
          };
        }).filter(c => c.phone.replace(/\D/g, "").length >= 10);

        if (!contacts.length) { setError("No valid phone numbers found."); return; }

        setCount(contacts.length);
        setPreview(contacts.slice(0, 3));
        onContactsLoaded(contacts);
      } catch {
        setError("Could not read file. Make sure it is .xlsx / .xls / .csv");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onContactsLoaded]);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length) { setError("Please upload a valid Excel file"); return; }
    if (accepted.length) processFile(accepted[0]);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const reset = () => { setFileName(null); setCount(null); setError(null); setPreview([]); };

  return (
    <div className="eu-wrap">
      {/* ── Drop zone ── */}
      {count === null && (
        <div
          {...getRootProps()}
          className={`eu-zone ${isDragActive ? "drag" : ""} ${error ? "has-error" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="eu-icon">{isDragActive ? "📂" : "📊"}</div>
          <div className="eu-title">
            {isDragActive ? "Drop it here!" : "Drag & drop Excel file here"}
          </div>
          <div className="eu-sub">or click to browse · .xlsx · .xls · .csv</div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="eu-error">
          ⚠️ {error} —{" "}
          <button className="eu-retry" onClick={reset}>Try again</button>
        </div>
      )}

      {/* ── Preview after upload ── */}
      {count !== null && (
        <div className="eu-preview">
          <div className="eu-preview-header">
            <span className="eu-preview-title">📊 {fileName}</span>
            <span className="eu-preview-count">{count.toLocaleString()} contacts</span>
          </div>
          <div className="eu-preview-list">
            {preview.map((c, i) => (
              <div key={i} className="eu-preview-row">
                <span>{c.phone}</span>
                <span>{c.name ?? "—"}</span>
              </div>
            ))}
          </div>
          <div className="eu-change-btn" onClick={reset}>
            ↩ Upload different file
          </div>
        </div>
      )}

      {/* ── Help text ── */}
      {count === null && !error && (
        <div className="eu-help">
          <div className="eu-help-row">
            <span className="eu-help-col">phone / mobile / number / whatsapp</span>
            <span>→ Phone column (required)</span>
          </div>
          <div className="eu-help-row">
            <span className="eu-help-col">name / customer_name</span>
            <span>→ Name column (optional)</span>
          </div>
          <div className="eu-help-note">✅ 10-digit numbers get +91 prefix automatically</div>
        </div>
      )}
    </div>
  );
}