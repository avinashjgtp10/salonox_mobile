import { useState } from "react";
import type { CatalogFormData } from "../types/catalog.types.ts";

const initialData: CatalogFormData = {
    basic: {
        name: "",
        categoryId: "",
        duration: 30,
        price: 0,
        paddingBefore: 0,
        paddingAfter: 0,
        description: "",
        active: true,
    },
    team: {
        allMembers: true,
        selectedMemberIds: [],
        availableMembers: [
            { id: "1", firstName: "Sarah", lastName: "Johnson", role: "Stylist" },
            { id: "2", firstName: "Mike", lastName: "Williams", role: "Barber" },
        ],
    },
    resources: {
        requireResource: false,
        selectedResourceId: "",
        availableResources: [
            { id: "r1", name: "Room 1" },
            { id: "r2", name: "Chair 1" },
        ],
    },
    addons: {
        selectedAddonIds: [],
        availableAddons: [
            { id: "a1", name: "Hair Wash", duration: 10, price: 15 },
            { id: "a2", name: "Scalp Massage", duration: 5, price: 10 },
        ],
    },
    onlineBooking: {
        enabled: true,
        onlineDescription: "",
        maxAdvanceDays: 365,
        minNoticeHours: 2,
        requireDeposit: false,
        depositAmount: 0,
    },
    portfolio: {
        images: [],
    },
    forms: {
        selectedFormIds: [],
        availableForms: [],
    },
    commission: {
        defaultType: "percentage",
        defaultValue: 0,
        memberCommissions: [
            { memberId: "1", memberName: "Sarah Johnson", commissionType: "percentage", commissionValue: 0 },
            { memberId: "2", memberName: "Mike Williams", commissionType: "percentage", commissionValue: 0 },
        ],
    },
    settings: {
        cancellationNoticeHours: 24,
        chargeCancellationFee: false,
        cancellationFeeAmount: 0,
        visibleToClients: true,
        taxable: true,
        colorLabel: "#6366f1",
    },
};

export const useServiceForm = (type: "single" | "bundle") => {
    console.log("Initializing form for:", type);
    const [formData, setFormData] = useState<CatalogFormData>(initialData);

    const updateField = <K extends keyof CatalogFormData>(section: K, value: CatalogFormData[K]) => {
        setFormData((prev) => ({ ...prev, [section]: value }));
    };

    const handleSubmit = async () => {
        console.log("Submitting:", formData);
        return true;
    };

    const loading = false;
    const error = null;

    return { formData, updateField, handleSubmit, loading, error };
};
