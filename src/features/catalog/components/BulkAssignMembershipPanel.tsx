// src/features/catalog/components/BulkAssignMembershipPanel.tsx
//
// Bulk tab of AssignMembershipModal — assign memberships to many clients from a
// CSV/XLSX file. Unlike the Clients/Products/Staff imports there is no backend
// /import route for this: the file is parsed and validated in the browser, then
// committed one row at a time through the same assignMembership() the single
// form uses. Slower than a server-side bulk insert, but it needs no new
// endpoint and no deploy, and each row fails independently with its own reason.
//
// Clients are matched, never created. A phone that matches nothing fails that
// row — silently creating client records as a side effect of assigning a
// membership would be a surprising thing for this screen to do.
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import * as XLSX from "xlsx";
import {
  CloudUpload, Download, CheckCircleFill, ExclamationCircleFill, X,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import type { AppDispatch } from "../../../store/store";
import { assignMembership, parseDateToISO } from "../utils/assignMembership";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

// Header aliases, lowercased. Spreadsheets in the wild label these columns a
// dozen ways, and a silent "column not recognised" is the single most common
// way an import appears to succeed while importing nothing.
const HEADER_MAP: Record<string, "mobile" | "clientName" | "membership" | "expiry" | "purchased"> = {
  "mobile": "mobile", "mobile number": "mobile", "phone": "mobile",
  "phone number": "mobile", "contact": "mobile", "contact number": "mobile",
  "client name": "clientName", "name": "clientName", "client": "clientName",
  "membership": "membership", "membership name": "membership",
  "plan": "membership", "tag": "membership",
  "expires on": "expiry", "expiry": "expiry", "expiry date": "expiry",
  "expires": "expiry", "valid till": "expiry", "valid until": "expiry",
  // Optional — the whole point of importing history is that these rows were
  // sold weeks or months ago, and without this every one of them lands
  // stamped with the moment of upload. A file that omits the column still
  // imports exactly as before, each row defaulting to now.
  "purchase date": "purchased", "purchased on": "purchased", "purchased": "purchased",
  "purchase on": "purchased", "start date": "purchased", "bought on": "purchased",
  "sold on": "purchased",
};

const TEMPLATE_COLUMNS = ["Mobile", "Client name", "Membership", "Expires on", "Purchase date"];
const TEMPLATE_ROWS = [
  ["9876543210", "Priya Sharma", "Gold", "31-12-2027", "01-01-2027"],
  // Second row deliberately leaves Purchase date blank — it's optional, and
  // the template is the only place that says so before someone uploads.
  ["9123456780", "Ravi Kumar", "Silver", "30-06-2027", ""],
];

type RowStatus = "ready" | "invalid" | "assigning" | "done" | "failed";

interface ParsedRow {
  n: number;                  // 1-based row number in the file, for error messages
  mobile: string;
  clientName: string;
  membership: string;
  expiryRaw: string;
  expiryIso: string | null;
  /** Optional back-date. null means "not given" — the row still assigns, and
   *  the backend leaves purchased_at on NOW(), which is the pre-existing
   *  behaviour for every file that has no such column. */
  purchasedRaw: string;
  purchasedIso: string | null;
  clientId: string | null;
  matchedName: string | null;
  status: RowStatus;
  error: string | null;
}

function downloadTemplate() {
  const csv = [TEMPLATE_COLUMNS, ...TEMPLATE_ROWS].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "membership_assign_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Digits only, last 10 — so "+91 98765 43210", "098765 43210" and
 *  "9876543210" all resolve to the same client. */
function phoneKey(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function readFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false }));
      } catch {
        reject(new Error("Could not read the file. Use .csv, .xlsx or .xls."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsArrayBuffer(file);
  });
}

interface Props {
  /** Bumped by the parent after a run so the assigned list refetches. */
  onAssigned?: () => void;
}

const BulkAssignMembershipPanel: React.FC<Props> = ({ onAssigned }) => {
  const dispatch = useDispatch<AppDispatch>();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [running, setRunning] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName(null);
    setFileError(null);
    setFinished(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Resolve each distinct phone to a client once, not once per row — a file
  // that gives the same client two memberships shouldn't search twice.
  const resolveClients = useCallback(async (parsed: ParsedRow[]): Promise<ParsedRow[]> => {
    const byPhone = new Map<string, { id: string; name: string } | null>();
    const distinct = Array.from(new Set(parsed.map((r) => phoneKey(r.mobile)).filter(Boolean)));

    for (const key of distinct) {
      try {
        const res = await api.get(CLIENT.SEARCH(key));
        const list: any[] = Array.isArray(res.data?.data) ? res.data.data : (res.data ?? []);
        const hit = list.find((c) => phoneKey(c.phone_number ?? "") === key);
        byPhone.set(key, hit
          ? { id: String(hit.id), name: `${hit.first_name ?? ""} ${hit.last_name ?? ""}`.trim() || hit.full_name || "" }
          : null);
      } catch {
        byPhone.set(key, null);
      }
    }

    return parsed.map((r) => {
      if (r.status === "invalid") return r;
      const match = byPhone.get(phoneKey(r.mobile));
      if (!match) {
        return { ...r, status: "invalid" as RowStatus, error: "No client with this mobile number" };
      }
      return { ...r, clientId: match.id, matchedName: match.name };
    });
  }, []);

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileError(null);
    setFinished(false);
    setFileName(file.name);
    try {
      const raw = await readFile(file);
      if (raw.length === 0) {
        setRows([]);
        setFileError("That file has no rows.");
        return;
      }

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const row: ParsedRow = {
          n: i + 2,            // +2: 1-based, and row 1 is the header
          mobile: "", clientName: "", membership: "", expiryRaw: "",
          expiryIso: null, purchasedRaw: "", purchasedIso: null,
          clientId: null, matchedName: null,
          status: "ready", error: null,
        };
        for (const [key, value] of Object.entries(r)) {
          const canon = HEADER_MAP[key.trim().toLowerCase()];
          if (!canon) continue;
          const v = String(value ?? "").trim();
          if (canon === "expiry") row.expiryRaw = v;
          else if (canon === "purchased") row.purchasedRaw = v;
          else row[canon] = v;
        }
        row.expiryIso = parseDateToISO(row.expiryRaw);
        row.purchasedIso = parseDateToISO(row.purchasedRaw);

        if (!row.mobile) { row.status = "invalid"; row.error = "Mobile number is required"; }
        else if (!row.membership) { row.status = "invalid"; row.error = "Membership name is required"; }
        else if (!row.expiryRaw) { row.status = "invalid"; row.error = "Expiry date is required"; }
        else if (!row.expiryIso) { row.status = "invalid"; row.error = `Unreadable date "${row.expiryRaw}" — use DD-MM-YYYY`; }
        // Only rejected when something WAS typed and couldn't be read. A blank
        // purchase date is valid and simply means "today" — silently importing
        // a typo as today's date is the exact bug this column exists to fix.
        else if (row.purchasedRaw && !row.purchasedIso) { row.status = "invalid"; row.error = `Unreadable purchase date "${row.purchasedRaw}" — use DD-MM-YYYY`; }
        return row;
      });

      if (parsed.every((r) => !r.mobile && !r.membership && !r.expiryRaw)) {
        setRows([]);
        setFileError("No recognised columns. Download the template to see the expected headers.");
        return;
      }

      setRows(await resolveClients(parsed));
    } catch (err: any) {
      setRows([]);
      setFileError(err?.message || "Could not read the file.");
    } finally {
      setParsing(false);
    }
  };

  // Committed sequentially, updating each row as it lands, so a long file shows
  // real progress and a mid-run failure leaves every earlier row already saved.
  const handleRun = async () => {
    setRunning(true);
    const planCache = new Map<string, string>();
    const working = [...rows];

    for (let i = 0; i < working.length; i++) {
      const row = working[i];
      if (row.status === "invalid" || row.status === "done" || !row.clientId || !row.expiryIso) continue;

      working[i] = { ...row, status: "assigning" };
      setRows([...working]);

      try {
        await assignMembership(
          dispatch,
          {
            clientId: row.clientId,
            name: row.membership,
            expiryIso: row.expiryIso,
            // undefined, not null, when the column is absent/blank — that's
            // what keeps the key out of the POST body entirely.
            purchasedIso: row.purchasedIso ?? undefined,
          },
          planCache,
        );
        working[i] = { ...row, status: "done", error: null };
      } catch (err: any) {
        working[i] = {
          ...row,
          status: "failed",
          error: err?.response?.data?.message || err?.message || "Assign failed",
        };
      }
      setRows([...working]);
    }

    setRunning(false);
    setFinished(true);
    onAssigned?.();
  };

  const counts = useMemo(() => ({
    total:   rows.length,
    ready:   rows.filter((r) => r.status === "ready").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
    done:    rows.filter((r) => r.status === "done").length,
    failed:  rows.filter((r) => r.status === "failed").length,
  }), [rows]);

  return (
    <div className="amm-bulk">
      <div className="amm-bulk__template">
        <span>Assign memberships to many clients at once.</span>
        <button type="button" className="amm-bulk__template-btn" onClick={downloadTemplate}>
          <Download size={13} /> Download template
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {rows.length === 0 ? (
        <button
          type="button"
          className="amm-bulk__drop"
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
        >
          <CloudUpload size={26} />
          <strong>{parsing ? "Reading…" : "Choose a CSV or Excel file"}</strong>
          <span>Columns: Mobile, Client name, Membership, Expires on, Purchase date (optional)</span>
        </button>
      ) : (
        <>
          <div className="amm-bulk__filebar">
            <span className="amm-bulk__filename">{fileName}</span>
            <span className="amm-bulk__counts">
              {counts.total} rows
              {counts.ready > 0   && <> · <b className="ok">{counts.ready} ready</b></>}
              {counts.done > 0    && <> · <b className="ok">{counts.done} assigned</b></>}
              {counts.invalid > 0 && <> · <b className="bad">{counts.invalid} skipped</b></>}
              {counts.failed > 0  && <> · <b className="bad">{counts.failed} failed</b></>}
            </span>
            <button type="button" className="amm-bulk__clear" onClick={reset} disabled={running} aria-label="Clear file">
              <X size={15} />
            </button>
          </div>

          <div className="amm-bulk__tablewrap">
            <table className="amm-bulk__table">
              <thead>
                <tr><th>#</th><th>Client</th><th>Membership</th><th>Purchased</th><th>Expires</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n} className={r.status === "invalid" || r.status === "failed" ? "amm-bulk__row--bad" : ""}>
                    <td className="amm-bulk__td-n" data-label="Row">{r.n}</td>
                    <td data-label="Client">
                      <div className="amm-bulk__client">{r.matchedName || r.clientName || "—"}</div>
                      <div className="amm-bulk__mobile">{r.mobile || "—"}</div>
                    </td>
                    <td data-label="Membership">{r.membership || "—"}</td>
                    {/* "Today" rather than a dash for a blank cell: the row
                        genuinely will be stamped with now, and showing that
                        before the run is the whole point of the column. */}
                    <td data-label="Purchased">{r.purchasedIso
                      ? formatDateDDMMYYYY(new Date(`${r.purchasedIso}T00:00:00`))
                      : (r.purchasedRaw || "Today")}</td>
                    <td data-label="Expires">{r.expiryIso ? formatDateDDMMYYYY(new Date(`${r.expiryIso}T00:00:00`)) : (r.expiryRaw || "—")}</td>
                    <td data-label="Status">
                      {r.status === "done" ? (
                        <span className="amm-bulk__st ok"><CheckCircleFill size={12} /> Assigned</span>
                      ) : r.status === "assigning" ? (
                        <span className="amm-bulk__st">Assigning…</span>
                      ) : r.status === "invalid" || r.status === "failed" ? (
                        <span className="amm-bulk__st bad" title={r.error ?? ""}>
                          <ExclamationCircleFill size={12} /> {r.error}
                        </span>
                      ) : (
                        <span className="amm-bulk__st">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="amm-bulk__actions">
            {finished ? (
              <span className="amm-bulk__summary">
                {counts.done} assigned{counts.failed > 0 ? `, ${counts.failed} failed` : ""}
                {counts.invalid > 0 ? `, ${counts.invalid} skipped` : ""}.
              </span>
            ) : (
              <span className="amm-bulk__summary">
                {counts.ready} of {counts.total} rows will be assigned.
              </span>
            )}
            <button
              type="button"
              className="amm-bulk__run"
              onClick={handleRun}
              disabled={running || counts.ready === 0}
            >
              {running ? "Assigning…" : `Assign ${counts.ready} membership${counts.ready === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}

      {fileError && <div className="amm__error">{fileError}</div>}
    </div>
  );
};

export default BulkAssignMembershipPanel;
