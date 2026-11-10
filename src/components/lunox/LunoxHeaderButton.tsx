import { useAuth } from "@/context/AuthContext";
import { canAccessLunox } from "@/utils/staffExperience";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LunoxSheet } from "./LunoxSheet";
function LunoxHeaderButtonContent() {
 const [open, setOpen] = useState(false);
 return <><Pressable accessibilityRole="button" accessibilityLabel="Lunox AI" onPress={() => setOpen(true)}><LinearGradient colors={["#CFCBE8", "#C9B5EC", "#BCD6E8", "#A7A2D0"]} style={{ width: 36, height: 36, padding: 3, borderRadius: 18 }}><View style={{ flex: 1, borderRadius: 15, backgroundColor: "#FAF9FC", alignItems: "center", justifyContent: "center" }}><Image source={require("../../../assets/images/brand/lunox-mark.png")} style={{ width: 23, height: 23 }} resizeMode="contain" /></View></LinearGradient></Pressable><LunoxSheet visible={open} onClose={() => setOpen(false)} /></>;
}

export function LunoxHeaderButton() {
 const { user } = useAuth();
 return canAccessLunox(user) ? <LunoxHeaderButtonContent  /> : null;
}
