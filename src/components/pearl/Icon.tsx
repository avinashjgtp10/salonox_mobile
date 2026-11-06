/**
 * SalonOX icon set (24×24 line icons). Same drawings as the prototype.
 * Rendered with SvgXml so the paths are shared 1:1; `color` drives stroke via currentColor.
 */
import { memo } from "react";
import { SvgXml } from "react-native-svg";
import { pearl } from "@/components/auth/pearl/tokens";

const PATHS = {
  mail: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M3.5 7.5l8.5 6 8.5-6\"/>",
  lock: "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"3\"/><path d=\"M8 11V7.5a4 4 0 0 1 8 0V11\"/>",
  eye: "<path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  eyeOff: "<path d=\"M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1\"/>",
  alert: "<path d=\"M12 3l9.5 17h-19z\"/><path d=\"M12 10v4M12 17h.01\"/>",
  info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8h.01\"/>",
  check: "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>",
  chevronLeft: "<path d=\"M15 6l-6 6 6 6\"/>",
  chevronRight: "<path d=\"M9 6l6 6-6 6\"/>",
  chevronDown: "<path d=\"M6 9l6 6 6-6\"/>",
  external: "<path d=\"M14 4h6v6\"/><path d=\"M20 4l-9 9\"/><path d=\"M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5\"/>",
  shield: "<path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/><path d=\"M9 12l2 2 4-4\"/>",
  repeat: "<path d=\"M17 2l4 4-4 4\"/><path d=\"M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4\"/><path d=\"M21 12v3a3 3 0 0 1-3 3H3\"/>",
  user: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4 3.6-6 8-6s8 2 8 6\"/>",
  wifiOff: "<path d=\"M3 3l18 18\"/><path d=\"M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.5M12 8a14 14 0 0 1 9.5 3.4M2.5 9.3A14.5 14.5 0 0 1 7 6.6\"/><path d=\"M12 20h.01\"/>",
  menu: "<path d=\"M4 7h16M4 12h16M4 17h10\"/>",
  bell: "<path d=\"M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>",
  pin: "<path d=\"M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
  home: "<path d=\"M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z\"/>",
  calendar: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/>",
  bolt: "<path d=\"M13 2L4 14h7l-1 8 9-12h-7z\"/>",
  chat: "<path d=\"M4 20l1.4-4.2A8 8 0 1 1 8.6 19z\"/><path d=\"M9 10.5c.5 2 2 3.5 4.5 4.5l1.2-1.2\"/>",
  gear: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>",
  search: "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-4-4\"/>",
  filter: "<path d=\"M4 6h16M7 12h10M10 18h4\"/>",
  plus: "<path d=\"M12 5v14M5 12h14\"/>",
  users: "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5\"/><path d=\"M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6c2.4.6 4 2.5 4 5.4\"/>",
  userAdd: "<circle cx=\"10\" cy=\"8\" r=\"4\"/><path d=\"M3 21c0-4 3.2-6 7-6 1.6 0 3 .3 4.2 1\"/><path d=\"M19 14v6M16 17h6\"/>",
  wallet: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M3 10h18M16 15h2\"/>",
  trend: "<path d=\"M3 17l6-6 4 4 8-8\"/><path d=\"M15 7h6v6\"/>",
  scissors: "<circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M8.6 8.6L20 20M8.6 15.4L20 4\"/>",
  bag: "<path d=\"M5 8h14l-1.2 12H6.2z\"/><path d=\"M9 8a3 3 0 0 1 6 0\"/>",
  clock: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>",
  box: "<path d=\"M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z\"/><path d=\"M3 7.5l9 4.5 9-4.5M12 12v9\"/>",
  logout: "<path d=\"M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3\"/><path d=\"M10 17l-5-5 5-5M5 12h11\"/>",
  note: "<path d=\"M6 3h9l4 4v14H6z\"/><path d=\"M14 3v5h5M9 13h6M9 17h4\"/>",
  store: "<path d=\"M4 9l1.5-5h13L20 9\"/><path d=\"M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0\"/><path d=\"M5 11v9h14v-9M10 20v-5h4v5\"/>",
  idCard: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><circle cx=\"9\" cy=\"11\" r=\"2\"/><path d=\"M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14.5 10h4M14.5 13.5h3\"/>",
  send: "<path d=\"M21 3L10 14\"/><path d=\"M21 3l-7 18-4-7-7-4z\"/>",
  receipt: "<path d=\"M6 3h12v18l-3-2-3 2-3-2-3 2z\"/><path d=\"M9 8h6M9 12h6M9 16h3\"/>",
  chart: "<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>",
  percent: "<path d=\"M19 5L5 19\"/><circle cx=\"7\" cy=\"7\" r=\"2.5\"/><circle cx=\"17\" cy=\"17\" r=\"2.5\"/>",
  target: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\"/>",
  layers: "<path d=\"M12 3l9 5-9 5-9-5z\"/><path d=\"M3 13l9 5 9-5\"/>",
  x: "<path d=\"M6 6l12 12M18 6L6 18\"/>",
  expense: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"3\"/><path d=\"M3 10h18M7 15h4\"/><path d=\"M16 3v3\"/>",
  edit: "<path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"M13 7l4 4\"/>",
  star: "<path d=\"M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z\"/>",
  lunox: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7l1.4 3.6L17 12l-3.6 1.4L12 17l-1.4-3.6L7 12l3.6-1.4z\"/>",
  gift: "<rect x=\"3\" y=\"9\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M3 13h18M12 9v12\"/><path d=\"M12 9S10.5 4 8 4.5 7 9 12 9zM12 9s1.5-5 4-4.5S17 9 12 9z\"/>",
} as const;

export type IconName = keyof typeof PATHS;

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export const Icon = memo(function Icon({ name, size = 20, color = pearl.muted, strokeWidth = 1.8 }: Props) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
});
