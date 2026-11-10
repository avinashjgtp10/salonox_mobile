import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { PasswordField } from "@/components/ui/PasswordField";
import { SettingsButton, SettingsRow, useSettingsStyles } from "./SettingsUI";
import { connectedBranchesService, type ConnectedBranch, type ConnectedBranchesData } from "@/services/connectedBranches.service";
import { getApiErrorMessage } from "@/services/api";
import { useAppToast } from "@/hooks/useAppToast";
import { useAppDispatch } from "@/store/hooks";
import { fetchBranchesThunk } from "@/middleware/branch/branch.thunk";
import { useAuth } from "@/context/AuthContext";

type Mode = "list" | "connect" | "create" | "reset" | "disconnect";
export function ConnectedBranchesSheet({ onClose, onOpenPortal }: { onClose: () => void; onOpenPortal: () => void }) {
  const ui = useSettingsStyles(), toast = useAppToast(), dispatch = useAppDispatch();
  const { user, switchSalon } = useAuth();
  const [mode, setMode] = useState<Mode>("list");
  const [data, setData] = useState<ConnectedBranchesData | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [selected, setSelected] = useState<ConnectedBranch | null>(null);
  const [mainName, setMainName] = useState("");
  const passwordRef = useRef<TextInput>(null), confirmRef = useRef<TextInput>(null);
  const lock = useRef(false), version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setError(null);
    try { const [result, name] = await Promise.all([connectedBranchesService.list(), connectedBranchesService.mainSalonName()]); if (current === version.current) { setData(result); setMainName(name); } }
    catch (failure) { if (current === version.current) setError(getApiErrorMessage(failure)); }
    finally { if (current === version.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { version.current += 1; }; }, [load]);
  const open = (next: Mode) => { Keyboard.dismiss(); setIdentity(""); setPassword(""); setConfirm(""); setError(null); setMode(next); };
  const close = () => { if (lock.current) return; Keyboard.dismiss(); setPassword(""); setConfirm(""); if (mode === "list") onClose(); else open("list"); };
  const save = async () => {
    if (lock.current) return;
    const username = identity.trim().toLowerCase();
    let validation: string | null = null;
    if (mode === "connect" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.trim()) || !password)) validation = "Enter the account's email and password.";
    if ((mode === "create" || (mode === "reset" && username)) && !/^[a-z0-9._-]{3,30}$/.test(username)) validation = "Username must be 3-30 characters: letters, numbers, dot, dash or underscore.";
    if ((mode === "create" || (mode === "reset" && password)) && password.length < 8) validation = "Password must be at least 8 characters.";
    if (mode === "create" && password !== confirm) validation = "Passwords don't match.";
    if (mode === "reset" && !username && !password) validation = "Enter a new username or password.";
    if (validation) { setError(validation); return; }
    lock.current = true; setBusy(true); setError(null); Keyboard.dismiss();
    try {
      if (mode === "connect") { await connectedBranchesService.connect(identity, password, () => setPassword("")); toast.showSuccess("Branch connected."); }
      else if (mode === "create") { await connectedBranchesService.createLogin(username, password); toast.showSuccess("Branch login created."); }
      else if (mode === "reset") { await connectedBranchesService.updateLogin({ ...(username ? { username } : {}), ...(password ? { password } : {}) }); toast.showSuccess("Branch login updated."); }
      else if (mode === "disconnect" && selected) {
        if (selected.branchSalonId === user?.salonId) {
          const main = await connectedBranchesService.main();
          if (main.user.salonId && main.user.salonId !== user.salonId) await switchSalon(main.user.salonId);
        }
        await connectedBranchesService.disconnect(selected.id); toast.showSuccess("Branch disconnected.");
      }
      setPassword(""); setConfirm(""); setIdentity(""); setMode("list");
      await load(); void dispatch(fetchBranchesThunk());
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  const title = mode === "connect" ? "Connect a branch" : mode === "create" ? "Create branch login" : mode === "reset" ? "Reset branch login" : mode === "disconnect" ? "Disconnect branch" : "Connected branches";
  return <BottomSheet visible pearlStyle centered={false} avoidKeyboard title={title} onClose={close}
    footer={mode !== "list" ? <><View style={{ minWidth: 90 }}><SettingsButton secondary label="Cancel" disabled={busy} onPress={close} /></View><View style={{ flex: 1 }}><SettingsButton label={mode === "connect" ? "Verify and connect" : mode === "disconnect" ? "Disconnect" : mode === "reset" ? "Save changes" : "Save"} loading={busy} onPress={() => void save()} /></View></> : undefined}>
    <View style={{ gap: 16 }}>
      {mode === "list" ? <>
        {!!mainName && <Text style={ui.title}>{mainName}</Text>}
        <Text translate style={ui.muted}>Connect your other SalonOX accounts as branches. One branch username and password signs you in to the Branch Owner portal, where you can see and enter all of them.</Text>
        {loading ? <Text translate style={ui.muted}>Loading branches…</Text> : data && <>
          <Text translate style={ui.section}>Branch login</Text>
          <View style={ui.formCard}><Text translate style={ui.muted}>One username and password for the Branch Owner portal. It lists your own salon and every connected account.</Text>
            {data.login ? <><Text style={ui.title}>@{data.login.username}</Text><SettingsButton label="Open Branch Portal" onPress={onOpenPortal} /><SettingsButton secondary label="Reset login" onPress={() => open("reset")} /></> : <><Text translate style={ui.muted}>{"You haven't created a branch login yet. Connect an account below, or create the login now."}</Text><SettingsButton label="Create branch login" onPress={() => open("create")} /></>}
          </View>
          <Text translate style={ui.section}>Connected accounts</Text><Text translate style={ui.muted}>SalonOX accounts connected to this one. Their own email logins keep working.</Text>
          {!data.branches.length && <Text translate style={ui.muted}>No accounts connected yet.</Text>}
          {data.branches.map(branch => <View key={branch.id} style={ui.formCard}><Text style={ui.title}>{branch.name || "Unnamed branch"}</Text><Text translate style={ui.muted}>{branch.subscription.live ? "Active" : "Subscription ended"}</Text>{branch.removable !== false && <SettingsRow title="Disconnect" icon="unlink-outline" onPress={() => { setSelected(branch); open("disconnect"); }} />}</View>)}
          <SettingsButton label="Connect branch" onPress={() => open("connect")} />
        </>}
      </> : mode === "disconnect" ? <Text style={ui.body}>Disconnect {selected?.name || "this branch"}? It will no longer appear in your Branch Owner portal. The account itself and its own email login are not affected.</Text> : <>
        <Text translate style={ui.muted}>{mode === "connect" ? "Enter the email and password of the SalonOX account you want to connect. It must have an active subscription. We only use them to check the account; the password isn't saved." : mode === "reset" ? "Leave a field empty to keep it as it is. A new password signs the branch login out everywhere." : "Set the username and password you'll use to sign in to the Branch Owner portal."}</Text>
        <Text translate style={ui.body}>{mode === "connect" ? "Account email" : mode === "reset" ? "New username" : "Branch username"}</Text>
        <TextInput accessibilityLabel={mode === "connect" ? "Account email" : "Branch username"} style={ui.input} autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={mode === "connect" ? 254 : 30} keyboardType={mode === "connect" ? "email-address" : "default"} value={identity} editable={!busy} onChangeText={value => { setIdentity(mode === "connect" ? value : value.toLowerCase()); setError(null); }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} />
        {mode !== "connect" && <Text translate style={ui.muted}>3-30 characters: letters, numbers, dot, dash or underscore.</Text>}
        <PasswordField ref={passwordRef} pearlStyle label={mode === "connect" ? "Account password" : mode === "reset" ? "New password" : "Branch password"} value={password} editable={!busy} onChangeText={value => { setPassword(value); setError(null); }} returnKeyType={mode === "create" ? "next" : "done"} blurOnSubmit={false} onSubmitEditing={() => mode === "create" ? confirmRef.current?.focus() : void save()} />
        {mode === "create" && <PasswordField ref={confirmRef} pearlStyle label="Confirm password" value={confirm} editable={!busy} onChangeText={value => { setConfirm(value); setError(null); }} returnKeyType="done" onSubmitEditing={() => void save()} />}
      </>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {mode === "list" && !!error && <SettingsButton secondary label="Retry" onPress={() => void load()} />}
    </View>
  </BottomSheet>;
}
