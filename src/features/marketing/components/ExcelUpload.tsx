import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'

interface Contact {
  phone: string
  name?: string
  [key: string]: string | undefined
}

interface Props {
  onContactsLoaded: (contacts: Contact[]) => void
}

export default function ExcelUpload({ onContactsLoaded }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [count, setCount]       = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [preview, setPreview]   = useState<Contact[]>([])
  const [columns, setColumns]   = useState<string[]>([])

  const processFile = useCallback(
    (file: File) => {
      setError(null)
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb   = XLSX.read(e.target?.result, { type: 'array' })
          const ws   = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: false })
          if (!rows.length) { setError('Excel file is empty.'); return }

          const cols = Object.keys(rows[0])
          setColumns(cols)

          const phoneCol = cols.find((c) =>
            ['phone','mobile','number','whatsapp','contact','tel'].some((k) =>
              c.toLowerCase().includes(k)
            )
          ) ?? cols[0]

          const nameCol = cols.find((c) => c.toLowerCase().includes('name'))

          const contacts: Contact[] = rows
            .map((row) => {
              const raw    = String(row[phoneCol] ?? '').trim()
              const digits = raw.replace(/\D/g, '')
              let phone    = raw.replace(/[\s\-().]/g, '')
              if (digits.length === 10) phone = `+91${digits}`
              else if (digits.length === 12 && digits.startsWith('91')) phone = `+${digits}`
              else if (!phone.startsWith('+') && digits.length > 10) phone = `+${digits}`
              return {
                phone,
                name: nameCol ? String(row[nameCol] ?? '').trim() || undefined : undefined,
                ...Object.fromEntries(cols.map((c) => [c, String(row[c] ?? '')])),
              }
            })
            .filter((c) => c.phone.replace(/\D/g, '').length >= 10)

          if (!contacts.length) { setError('No valid phone numbers found.'); return }
          setCount(contacts.length)
          setPreview(contacts.slice(0, 3))
          onContactsLoaded(contacts)
        } catch { setError('Could not read file. Make sure it is .xlsx / .xls / .csv') }
      }
      reader.readAsArrayBuffer(file)
    },
    [onContactsLoaded]
  )

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      if (rejected.length) { setError('Please upload a valid Excel file'); return }
      if (accepted.length) processFile(accepted[0])
    },
    [processFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  })

  const reset = () => { setFileName(null); setCount(null); setError(null); setPreview([]); setColumns([]) }

  return (
    <div className="excel-upload">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dragging' : ''} ${count !== null ? 'success' : ''} ${error ? 'has-error' : ''}`}
      >
        <input {...getInputProps()} />
        {count !== null ? (
          <div className="dz-success">
            <div className="dz-icon">✅</div>
            <div className="dz-filename">{fileName}</div>
            <div className="dz-count">{count.toLocaleString()} valid contacts loaded</div>
            <button className="dz-reset" onClick={(e) => { e.stopPropagation(); reset() }}>
              Upload different file
            </button>
          </div>
        ) : isDragActive ? (
          <div className="dz-idle">
            <div className="dz-icon">📂</div>
            <div className="dz-title">Drop it here!</div>
          </div>
        ) : (
          <div className="dz-idle">
            <div className="dz-icon">📊</div>
            <div className="dz-title">Drag & drop Excel file here</div>
            <div className="dz-sub">or click to browse</div>
            <div className="dz-formats">.xlsx · .xls · .csv</div>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <strong>⚠️ {error}</strong>
          <button className="dz-reset-err" onClick={reset}>Try again</button>
        </div>
      )}

      {columns.length > 0 && count !== null && (
        <div className="detected-cols">
          <span className="detected-label">Detected columns:</span>
          {columns.map((c) => <span key={c} className="col-pill">{c}</span>)}
        </div>
      )}

      {preview.length > 0 && (
        <div className="preview-box">
          <div className="preview-title">Preview (first {preview.length})</div>
          <table className="preview-table">
            <thead><tr><th>Phone</th><th>Name</th></tr></thead>
            <tbody>
              {preview.map((c, i) => (
                <tr key={i}><td className="mono">{c.phone}</td><td>{c.name ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {count === null && !error && (
        <div className="upload-help">
          <div className="help-title">Accepted formats</div>
          <div className="help-row"><span className="help-col">phone / mobile / number / whatsapp</span><span>→ Phone column (required)</span></div>
          <div className="help-row"><span className="help-col">name / customer_name</span><span>→ Name column (optional)</span></div>
          <div className="help-note">✅ 10-digit numbers get +91 prefix automatically</div>
        </div>
      )}
    </div>
  )
}