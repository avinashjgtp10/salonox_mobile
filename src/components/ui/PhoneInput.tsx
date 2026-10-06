import { Text, TextInput } from "@/components/ui/AppTypography";

import { Ionicons } from "@expo/vector-icons";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Animated, Dimensions, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AsYouType,
  getExampleNumber,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";
import { PHONE_DIGIT_COUNT } from "@/utils/validation";

const phoneExamples = require("libphonenumber-js/examples.mobile.json");

const createPhoneColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  primary: theme.primary,
  secondary: theme.secondary,
  text: theme.heading,
  textSecondary: theme.text2,
  placeholder: theme.placeholder,
  inputBg: scheme === "dark" ? theme.bg2 : theme.card,
  inputBorder: theme.border,
  inputBorderFocus: theme.focusBorder,
  error: theme.error,
  errorBg: theme.errorBg,
  cardBg: theme.card,
  searchBg: theme.bg2,
  separator: theme.border,
  overlay: scheme === "dark" ? "rgba(0, 0, 0, 0.72)" : "rgba(20, 18, 16, 0.55)",
});

type PhoneColors = ReturnType<typeof createPhoneColors>;

const usePhoneColors = () => {
  const { colors, scheme } = useAppTheme();

  return useMemo(() => createPhoneColors(colors, scheme), [colors, scheme]);
};


export interface Country {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  country?: CountryCode;
  onCountryChange?: (countryCode: CountryCode) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}


export const COUNTRIES: Country[] = [
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "AX", name: "Åland Islands", dialCode: "+358", flag: "🇦🇽" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "AS", name: "American Samoa", dialCode: "+1684", flag: "🇦🇸" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "🇦🇩" },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
  { code: "AI", name: "Anguilla", dialCode: "+1264", flag: "🇦🇮" },
  { code: "AG", name: "Antigua & Barbuda", dialCode: "+1268", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "🇦🇲" },
  { code: "AW", name: "Aruba", dialCode: "+297", flag: "🇦🇼" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", dialCode: "+994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", dialCode: "+1242", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", dialCode: "+1246", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", dialCode: "+501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", dialCode: "+229", flag: "🇧🇯" },
  { code: "BM", name: "Bermuda", dialCode: "+1441", flag: "🇧🇲" },
  { code: "BT", name: "Bhutan", dialCode: "+975", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia & Herzegovina", dialCode: "+387", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", dialCode: "+267", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "IO", name: "British Indian Ocean Territory", dialCode: "+246", flag: "🇮🇴" },
  { code: "BN", name: "Brunei", dialCode: "+673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", dialCode: "+257", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde", dialCode: "+238", flag: "🇨🇻" },
  { code: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "🇨🇲" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "KY", name: "Cayman Islands", dialCode: "+1345", flag: "🇰🇾" },
  { code: "CF", name: "Central African Republic", dialCode: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Chad", dialCode: "+235", flag: "🇹🇩" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "CX", name: "Christmas Island", dialCode: "+61", flag: "🇨🇽" },
  { code: "CC", name: "Cocos (Keeling) Islands", dialCode: "+61", flag: "🇨🇨" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", dialCode: "+269", flag: "🇰🇲" },
  { code: "CG", name: "Congo", dialCode: "+242", flag: "🇨🇬" },
  { code: "CD", name: "Congo, Dem. Rep.", dialCode: "+243", flag: "🇨🇩" },
  { code: "CK", name: "Cook Islands", dialCode: "+682", flag: "🇨🇰" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
  { code: "CW", name: "Curaçao", dialCode: "+599", flag: "🇨🇼" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", dialCode: "+1767", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1809", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", dialCode: "+291", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "🇪🇹" },
  { code: "FK", name: "Falkland Islands", dialCode: "+500", flag: "🇫🇰" },
  { code: "FO", name: "Faroe Islands", dialCode: "+298", flag: "🇫🇴" },
  { code: "FJ", name: "Fiji", dialCode: "+679", flag: "🇫🇯" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "GF", name: "French Guiana", dialCode: "+594", flag: "🇬🇫" },
  { code: "PF", name: "French Polynesia", dialCode: "+689", flag: "🇵🇫" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", dialCode: "+220", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", dialCode: "+995", flag: "🇬🇪" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", dialCode: "+350", flag: "🇬🇮" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "GL", name: "Greenland", dialCode: "+299", flag: "🇬🇱" },
  { code: "GD", name: "Grenada", dialCode: "+1473", flag: "🇬🇩" },
  { code: "GP", name: "Guadeloupe", dialCode: "+590", flag: "🇬🇵" },
  { code: "GU", name: "Guam", dialCode: "+1671", flag: "🇬🇺" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "GG", name: "Guernsey", dialCode: "+44", flag: "🇬🇬" },
  { code: "GN", name: "Guinea", dialCode: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", dialCode: "+592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", dialCode: "+509", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "🇮🇸" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "IM", name: "Isle of Man", dialCode: "+44", flag: "🇮🇲" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", dialCode: "+1876", flag: "🇯🇲" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "JE", name: "Jersey", dialCode: "+44", flag: "🇯🇪" },
  { code: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", dialCode: "+686", flag: "🇰🇮" },
  { code: "KP", name: "Korea, North", dialCode: "+850", flag: "🇰🇵" },
  { code: "KR", name: "Korea, South", dialCode: "+82", flag: "🇰🇷" },
  { code: "XK", name: "Kosovo", dialCode: "+383", flag: "🇽🇰" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996", flag: "🇰🇬" },
  { code: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", dialCode: "+266", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
  { code: "LY", name: "Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "🇱🇺" },
  { code: "MO", name: "Macao", dialCode: "+853", flag: "🇲🇴" },
  { code: "MG", name: "Madagascar", dialCode: "+261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", dialCode: "+265", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", dialCode: "+960", flag: "🇲🇻" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", dialCode: "+692", flag: "🇲🇭" },
  { code: "MQ", name: "Martinique", dialCode: "+596", flag: "🇲🇶" },
  { code: "MR", name: "Mauritania", dialCode: "+222", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "🇲🇺" },
  { code: "YT", name: "Mayotte", dialCode: "+262", flag: "🇾🇹" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", dialCode: "+691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", dialCode: "+976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "🇲🇪" },
  { code: "MS", name: "Montserrat", dialCode: "+1664", flag: "🇲🇸" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", dialCode: "+264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", dialCode: "+674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "NC", name: "New Caledonia", dialCode: "+687", flag: "🇳🇨" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "NU", name: "Niue", dialCode: "+683", flag: "🇳🇺" },
  { code: "NF", name: "Norfolk Island", dialCode: "+672", flag: "🇳🇫" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "🇲🇰" },
  { code: "MP", name: "Northern Mariana Islands", dialCode: "+1670", flag: "🇲🇵" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "PW", name: "Palau", dialCode: "+680", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", dialCode: "+970", flag: "🇵🇸" },
  { code: "PA", name: "Panama", dialCode: "+507", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1787", flag: "🇵🇷" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "RE", name: "Réunion", dialCode: "+262", flag: "🇷🇪" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", dialCode: "+250", flag: "🇷🇼" },
  { code: "BL", name: "Saint Barthélemy", dialCode: "+590", flag: "🇧🇱" },
  { code: "SH", name: "Saint Helena", dialCode: "+290", flag: "🇸🇭" },
  { code: "KN", name: "Saint Kitts & Nevis", dialCode: "+1869", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", dialCode: "+1758", flag: "🇱🇨" },
  { code: "MF", name: "Saint Martin", dialCode: "+590", flag: "🇲🇫" },
  { code: "PM", name: "Saint Pierre & Miquelon", dialCode: "+508", flag: "🇵🇲" },
  { code: "VC", name: "Saint Vincent & Grenadines", dialCode: "+1784", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", dialCode: "+685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome & Principe", dialCode: "+239", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", dialCode: "+248", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "SX", name: "Sint Maarten", dialCode: "+1721", flag: "🇸🇽" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", dialCode: "+252", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", dialCode: "+211", flag: "🇸🇸" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", dialCode: "+597", flag: "🇸🇷" },
  { code: "SJ", name: "Svalbard & Jan Mayen", dialCode: "+47", flag: "🇸🇯" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "SY", name: "Syria", dialCode: "+963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", dialCode: "+670", flag: "🇹🇱" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "TK", name: "Tokelau", dialCode: "+690", flag: "🇹🇰" },
  { code: "TO", name: "Tonga", dialCode: "+676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad & Tobago", dialCode: "+1868", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993", flag: "🇹🇲" },
  { code: "TC", name: "Turks & Caicos Islands", dialCode: "+1649", flag: "🇹🇨" },
  { code: "TV", name: "Tuvalu", dialCode: "+688", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", dialCode: "+678", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", dialCode: "+39", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "VG", name: "British Virgin Islands", dialCode: "+1284", flag: "🇻🇬" },
  { code: "VI", name: "US Virgin Islands", dialCode: "+1340", flag: "🇻🇮" },
  { code: "WF", name: "Wallis & Futuna", dialCode: "+681", flag: "🇼🇫" },
  { code: "EH", name: "Western Sahara", dialCode: "+212", flag: "🇪🇭" },
  { code: "YE", name: "Yemen", dialCode: "+967", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", dialCode: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼" },
];

const DEFAULT_COUNTRY: Country = COUNTRIES.find((c) => c.code === "IN")!;


function digitsOnly(str: string): string {
  return str.replace(/\D/g, "");
}

function toE164(digits: string, country: Country): string {
  if (!digits) return "";
  try {
    const parsed = parsePhoneNumber(digits, country.code);
    return parsed.format("E.164");
  } catch {
    return `${country.dialCode}${digits}`;
  }
}

function formatNationalForDisplay(digits: string, countryCode: CountryCode): string {
  if (!digits) return "";
  try {
    const formatter = new AsYouType(countryCode);
    const result = formatter.input(digits);
    const callingCode = formatter.getCallingCode();
    if (callingCode && result.startsWith(`+${callingCode}`)) {
      return result.slice(`+${callingCode}`.length).trimStart();
    }
    return result || digits;
  } catch {
    return digits;
  }
}

function parseE164(e164: string): { country: Country; nationalDigits: string } | null {
  if (!e164) return null;
  try {
    const parsed = parsePhoneNumber(e164);
    if (!parsed?.country) return null;
    const country = COUNTRIES.find((c) => c.code === parsed.country) ?? null;
    if (!country) return null;
    return { country, nationalDigits: parsed.nationalNumber };
  } catch {
    return null;
  }
}

function getCountryPlaceholder(countryCode: CountryCode): string {
  try {
    const example = getExampleNumber(countryCode, phoneExamples);
    return example?.formatNational() ?? "Enter phone number";
  } catch {
    return "Enter phone number";
  }
}


interface CountryCodePickerModalProps {
  visible: boolean;
  selected: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

const COUNTRY_PICKER_MAX_SHEET_HEIGHT_RATIO = 0.82;
const COUNTRY_PICKER_ROW_HEIGHT = 56;
const COUNTRY_PICKER_MIN_LIST_HEIGHT = COUNTRY_PICKER_ROW_HEIGHT * 4;

export const CountryCodePickerModal = memo(function CountryCodePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CountryCodePickerModalProps) {
  const C = usePhoneColors();
  const pickerStyles = useMemo(() => createPickerStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const searchRef = useRef<TextInput>(null);
  const hasOpened = useRef(false);

  const filtered = useMemo<Country[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.dialCode.replace("+", "").includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (visible) {
      hasOpened.current = true;
      slideAnim.setValue(600);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 180,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        searchRef.current?.focus();
      });
    } else if (hasOpened.current) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 600,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (event: { endCoordinates?: { height?: number } }) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    };
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (country: Country) => {
      AccessibilityInfo.announceForAccessibility(
        `${country.name} selected, dial code ${country.dialCode}`,
      );
      onSelect(country);
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: Country }) => {
      const isSelected = item.code === selected.code;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${item.dialCode}`}
          accessibilityState={{ selected: isSelected }}
          onPress={() => handleSelect(item)}
          style={({ pressed }) => [
            pickerStyles.countryRow,
            isSelected && pickerStyles.countryRowSelected,
            pressed && pickerStyles.countryRowPressed,
          ]}
        >
          <Text style={pickerStyles.countryFlag}>{item.flag}</Text>
          <Text style={pickerStyles.countryName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={pickerStyles.countryDial}>{item.dialCode}</Text>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={C.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </Pressable>
      );
    },
    [
      C.primary,
      handleSelect,
      pickerStyles.countryDial,
      pickerStyles.countryFlag,
      pickerStyles.countryName,
      pickerStyles.countryRow,
      pickerStyles.countryRowPressed,
      pickerStyles.countryRowSelected,
      selected.code,
    ],
  );

  const keyExtractor = useCallback((item: Country) => item.code, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Country> | null | undefined, index: number) => ({
      length: COUNTRY_PICKER_ROW_HEIGHT,
      offset: COUNTRY_PICKER_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setQuery(""), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const windowHeight = Dimensions.get("window").height;
  const keyboardGap = keyboardHeight > 0 ? 8 : 0;
  const sheetBottom = keyboardHeight > 0
    ? keyboardHeight + keyboardGap
    : Math.max(insets.bottom, 12);
  const availableHeight =
    windowHeight - sheetBottom - Math.max(insets.top, Platform.OS === "ios" ? 18 : 8);
  const sheetMaxHeight = Math.max(
    COUNTRY_PICKER_MIN_LIST_HEIGHT + 158,
    Math.min(windowHeight * COUNTRY_PICKER_MAX_SHEET_HEIGHT_RATIO, availableHeight),
  );
  const listMaxHeight = Math.max(COUNTRY_PICKER_MIN_LIST_HEIGHT, sheetMaxHeight - 158);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >

      <Animated.View style={[pickerStyles.overlay, { opacity: opacityAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close country selector"
          accessibilityRole="button"
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
        style={pickerStyles.keyboardLayer}
      >

      <Animated.View
        style={[
          pickerStyles.sheet,
          {
            bottom: sheetBottom,
            maxHeight: sheetMaxHeight,
            paddingBottom: Platform.OS === "ios" ? 20 : 14,
          },
          { transform: [{ translateY: slideAnim }] },
        ]}
        accessibilityViewIsModal
        accessibilityLabel="Country selector"
      >

        <View style={pickerStyles.handleBar} />


        <View style={pickerStyles.sheetHeader}>
          <Text style={pickerStyles.sheetTitle}>Select Country</Text>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close country selector"
          >
            <Ionicons name="close-circle" size={26} color={C.textSecondary} />
          </Pressable>
        </View>


        <View style={pickerStyles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={C.textSecondary}
            style={pickerStyles.searchIcon}
          />
          <TextInput
            ref={searchRef}
            style={pickerStyles.searchInput}
            placeholder="Search by name, ISO code, or +dial"
            placeholderTextColor={C.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search countries"
          />
        </View>


        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={EmptyList}
          contentContainerStyle={pickerStyles.listContent}
          style={{ maxHeight: listMaxHeight }}
          initialNumToRender={20}
          maxToRenderPerBatch={30}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const Separator = () => {
  const C = usePhoneColors();
  const pickerStyles = useMemo(() => createPickerStyles(C), [C]);

  return <View style={pickerStyles.separator} />;
};
const EmptyList = () => {
  const C = usePhoneColors();
  const pickerStyles = useMemo(() => createPickerStyles(C), [C]);

  return (
    <View style={pickerStyles.emptyContainer}>
      <Ionicons name="globe-outline" size={40} color={C.placeholder} />
      <Text style={pickerStyles.emptyText}>No countries found</Text>
    </View>
  );
};



export const PhoneInput = memo(forwardRef<TextInput, PhoneInputProps>(function PhoneInput({
  value,
  onChange,
  country: controlledCountryCode,
  onCountryChange,
  error,
  disabled = false,
  required = false,
  placeholder: customPlaceholder,
  autoFocus = false,
  editable = true,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
}: PhoneInputProps, forwardedRef) {
  const C = usePhoneColors();
  const inputStyles = useMemo(() => createInputStyles(C), [C]);


  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (controlledCountryCode) {
      return COUNTRIES.find((c) => c.code === controlledCountryCode) ?? DEFAULT_COUNTRY;
    }
    return DEFAULT_COUNTRY;
  });

  const [rawDigits, setRawDigits] = useState("");

  const [displayValue, setDisplayValue] = useState("");

  const [isFocused, setIsFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);


  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as TextInput);

  const lastEmittedE164 = useRef("");


  useEffect(() => {
    if (value === lastEmittedE164.current) return;

    lastEmittedE164.current = value;

    if (!value) {
      setRawDigits("");
      setDisplayValue("");
      return;
    }

    const parsed = parseE164(value);
    if (parsed) {
      setSelectedCountry(parsed.country);
      const nationalDigits = parsed.nationalDigits.slice(0, PHONE_DIGIT_COUNT);
      setRawDigits(nationalDigits);
      setDisplayValue(
        formatNationalForDisplay(nationalDigits, parsed.country.code),
      );
    } else {
      const fallbackDigits = digitsOnly(value).slice(0, PHONE_DIGIT_COUNT);
      setRawDigits(fallbackDigits);
      setDisplayValue(fallbackDigits);
    }
  }, [value]);


  useEffect(() => {
    if (!controlledCountryCode) return;
    const newCountry = COUNTRIES.find((c) => c.code === controlledCountryCode);
    if (newCountry && newCountry.code !== selectedCountry.code) {
      setSelectedCountry(newCountry);
    }
  }, [controlledCountryCode, selectedCountry.code]);


  const placeholder = useMemo(
    () => customPlaceholder ?? getCountryPlaceholder(selectedCountry.code),
    [customPlaceholder, selectedCountry.code],
  );


  const handleTextChange = useCallback(
    (text: string) => {
      let digits = digitsOnly(text);

      digits = digits.slice(0, PHONE_DIGIT_COUNT);
      setDisplayValue(digits);
      setRawDigits(digits);

      const e164 = toE164(digits, selectedCountry);
      lastEmittedE164.current = e164;
      onChange(e164);
    },
    [selectedCountry, onChange],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (displayValue !== rawDigits && !isFocused) {
      setDisplayValue(rawDigits);
    }
    onFocusProp?.();
  }, [displayValue, rawDigits, isFocused, onFocusProp]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (rawDigits) {
      const formatted = formatNationalForDisplay(rawDigits, selectedCountry.code);
      setDisplayValue(formatted);
    }
    onBlurProp?.();
  }, [rawDigits, selectedCountry.code, onBlurProp]);

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      setPickerOpen(false);

      onCountryChange?.(country.code);

      if (rawDigits) {
        const e164 = toE164(rawDigits, country);
        lastEmittedE164.current = e164;
        onChange(e164);
        if (!isFocused) {
          setDisplayValue(formatNationalForDisplay(rawDigits, country.code));
        }
      } else {
        const e164 = "";
        lastEmittedE164.current = e164;
        onChange(e164);
      }

      setTimeout(() => inputRef.current?.focus(), 80);
    },
    [rawDigits, isFocused, onChange, onCountryChange],
  );

  const handleClear = useCallback(() => {
    setDisplayValue("");
    setRawDigits("");
    const e164 = "";
    lastEmittedE164.current = e164;
    onChange(e164);
    inputRef.current?.focus();
  }, [onChange]);

  const handleOpenPicker = useCallback(() => {
    if (disabled || editable === false) return;
    setPickerOpen(true);
  }, [disabled, editable]);

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);


  const isEditable = editable && !disabled;
  const hasError = Boolean(error);


  return (
    <View style={inputStyles.root}>

      <View
        style={[
          inputStyles.row,
          isFocused && inputStyles.rowFocused,
          hasError && inputStyles.rowError,
          disabled && inputStyles.rowDisabled,
        ]}
        accessibilityLabel="Phone number"
        accessibilityRole="none"
      >

        <Pressable
          onPress={handleOpenPicker}
          disabled={disabled || editable === false}
          style={({ pressed }) => [
            inputStyles.countryButton,
            pressed && inputStyles.countryButtonPressed,
            (disabled || editable === false) && inputStyles.countryButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Country: ${selectedCountry.name}, ${selectedCountry.dialCode}. Tap to change.`}
          accessibilityHint="Opens country selector modal"
          accessibilityState={{ disabled: disabled || editable === false }}
        >
          <Text style={inputStyles.flagText} accessibilityLabel="">
            {selectedCountry.flag}
          </Text>
          <Text style={inputStyles.dialCode}>{selectedCountry.dialCode}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={disabled ? C.placeholder : C.textSecondary}
            style={inputStyles.chevron}
          />
        </Pressable>




        <TextInput
          ref={inputRef}
          style={[inputStyles.textInput, disabled && inputStyles.textInputDisabled]}
          value={displayValue}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType="phone-pad"
          maxLength={PHONE_DIGIT_COUNT}
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          returnKeyType="next"
          autoFocus={autoFocus}
          editable={isEditable}
          selectTextOnFocus={false}
          accessibilityLabel={
            required
              ? `Phone number for ${selectedCountry.name}, required`
              : `Phone number for ${selectedCountry.name}`
          }
          accessibilityHint={`Enter your ${selectedCountry.name} phone number`}
          importantForAccessibility="yes"
          underlineColorAndroid="transparent"
        />


        {displayValue.length > 0 && isEditable && (
          <Pressable
            onPress={handleClear}
            hitSlop={10}
            style={inputStyles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear phone number"
          >
            <Ionicons name="close-circle" size={18} color={C.placeholder} />
          </Pressable>
        )}
      </View>



      <View style={inputStyles.errorSlot}>
        {hasError && (
          <View style={inputStyles.errorRow}>
            <Ionicons
              name="alert-circle-outline"
              size={13}
              color={C.error}
              style={{ marginRight: 4 }}
            />
            <Text
              style={inputStyles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          </View>
        )}
      </View>


      <CountryCodePickerModal
        visible={pickerOpen}
        selected={selectedCountry}
        onSelect={handleCountrySelect}
        onClose={handleClosePicker}
      />
    </View>
  );
}));


const createPickerStyles = (C: PhoneColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  keyboardLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: C.cardBg,
    borderRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.inputBorder,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.searchBg,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    height: "100%",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: COUNTRY_PICKER_ROW_HEIGHT,
    borderRadius: 12,
  },
  countryRowSelected: {
    backgroundColor: "rgba(28, 25, 23, 0.08)",
  },
  countryRowPressed: {
    backgroundColor: "rgba(28, 25, 23, 0.06)",
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
    lineHeight: 28,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },
  countryDial: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: "600",
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: C.separator,
    marginHorizontal: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: "500",
  },
});


const createInputStyles = (C: PhoneColors) => StyleSheet.create({
  root: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    height: 54,
    overflow: "hidden",
  },
  rowFocused: {
    borderColor: C.inputBorderFocus,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  rowError: {
    borderColor: C.error,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: "100%",
    gap: 4,
  },
  countryButtonPressed: {
    backgroundColor: "rgba(28, 25, 23, 0.06)",
  },
  countryButtonDisabled: {
    opacity: 0.5,
  },
  flagText: {
    fontSize: 22,
    lineHeight: 26,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0,
  },
  chevron: {
    marginTop: 1,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingHorizontal: 14,
    height: "100%",
    backgroundColor: "transparent",
  },
  textInputDisabled: {
    color: C.textSecondary,
  },
  clearButton: {
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  errorSlot: {
    minHeight: 22,
    paddingTop: 5,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
