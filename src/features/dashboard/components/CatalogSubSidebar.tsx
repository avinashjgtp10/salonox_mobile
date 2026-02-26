import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function CatalogSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Catalog</h3>
        <button className="close-btn" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="sub-link">Service menu</div>
      <div className="sub-link">Memberships</div>
      <div className="sub-link">Products</div>

      <hr style={{ margin: "20px 0" }} />

      <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>Inventory</h4>

      <div className="sub-link">Stocktakes</div>
      <div className="sub-link">Stock orders</div>
      <div className="sub-link">Suppliers</div>

    </div>
  )
}