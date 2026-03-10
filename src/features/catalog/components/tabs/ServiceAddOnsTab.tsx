import React from "react";
import type { ServiceAddOnsData, AddOnService } from "../../types/catalog.types.ts";

interface Props {
    data: ServiceAddOnsData;
    onChange: (data: ServiceAddOnsData) => void;
}

const ServiceAddOnsTab: React.FC<Props> = ({ data, onChange }) => {
    const toggleAddon = (addonId: string) => {
        const selected = data.selectedAddonIds.includes(addonId)
            ? data.selectedAddonIds.filter((id: string) => id !== addonId)
            : [...data.selectedAddonIds, addonId];
        onChange({ ...data, selectedAddonIds: selected });
    };

    return (
        <div className="tab-content-panel">
            <h5 className="tab-content-panel__title">Service Add-Ons</h5>
            <p className="text-muted mb-3">Select services that can be added on during booking.</p>
            {data.availableAddons.length === 0 ? (
                <div className="alert alert-info">No add-ons available. Create services first to use them as add-ons.</div>
            ) : (
                <div className="addons-list">
                    {data.availableAddons.map((addon: AddOnService) => (
                        <div key={addon.id} className="addon-item">
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" id={`addon-${addon.id}`}
                                    checked={data.selectedAddonIds.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                                <label className="form-check-label d-flex justify-content-between w-100" htmlFor={`addon-${addon.id}`}>
                                    <span>{addon.name}</span>
                                    <span className="text-muted">{addon.duration} min · ${addon.price.toFixed(2)}</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServiceAddOnsTab;