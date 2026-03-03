import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function CatalogSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
  <h3>Catalog</h3>

  <button className="floating-close" onClick={onClose}>
    <ChevronLeft size={16} />
  </button>
</div>

      <div className="sub-link">Service menu</div>
      <div className="sub-link">Memberships</div>
      <div className="sub-link">Products</div>
       <hr className="sub-divider" />

<div className="sub-category">
  Inventory
</div>
      <div className="sub-link">Stocktakes</div>
      <div className="sub-link">Stock orders</div>
      <div className="sub-link">Suppliers</div>

    </div>
  )
}