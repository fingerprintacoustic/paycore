/**
 * A country selector for the phone field, so users type their number the
 * way they naturally would (e.g. "0771 234 567") instead of needing to
 * know their country's dial code and E.164 formatting rules themselves.
 *
 * `stripsLeadingZero` marks countries where the national/trunk dialing
 * convention starts local numbers with a "0" that must be dropped once
 * the country code is prepended — e.g. Zimbabwe's "0771234567" becomes
 * "+263771234567", not "+2630771234567". Countries without this
 * convention (the US/Canada, for example) leave the number as typed.
 *
 * This list isn't exhaustive — it prioritizes markets this app is
 * actually likely to see users from. Add more as needed; the shape is
 * simple enough to extend without touching any other logic.
 */
export interface CountryOption {
  iso: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string; // with leading +
  stripsLeadingZero: boolean;
}

export const COUNTRIES: CountryOption[] = [
  { iso: "US", name: "United States", dialCode: "+1", stripsLeadingZero: false },
  { iso: "CA", name: "Canada", dialCode: "+1", stripsLeadingZero: false },
  { iso: "GB", name: "United Kingdom", dialCode: "+44", stripsLeadingZero: true },
  { iso: "ZW", name: "Zimbabwe", dialCode: "+263", stripsLeadingZero: true },
  { iso: "ZA", name: "South Africa", dialCode: "+27", stripsLeadingZero: true },
  { iso: "NG", name: "Nigeria", dialCode: "+234", stripsLeadingZero: true },
  { iso: "KE", name: "Kenya", dialCode: "+254", stripsLeadingZero: true },
  { iso: "GH", name: "Ghana", dialCode: "+233", stripsLeadingZero: true },
  { iso: "IN", name: "India", dialCode: "+91", stripsLeadingZero: true },
  { iso: "AU", name: "Australia", dialCode: "+61", stripsLeadingZero: true },
  { iso: "DE", name: "Germany", dialCode: "+49", stripsLeadingZero: true },
  { iso: "FR", name: "France", dialCode: "+33", stripsLeadingZero: true },
  { iso: "ES", name: "Spain", dialCode: "+34", stripsLeadingZero: false },
  { iso: "IT", name: "Italy", dialCode: "+39", stripsLeadingZero: false },
  { iso: "PT", name: "Portugal", dialCode: "+351", stripsLeadingZero: false },
  { iso: "NL", name: "Netherlands", dialCode: "+31", stripsLeadingZero: true },
  { iso: "IE", name: "Ireland", dialCode: "+353", stripsLeadingZero: true },
  { iso: "BR", name: "Brazil", dialCode: "+55", stripsLeadingZero: true },
  { iso: "MX", name: "Mexico", dialCode: "+52", stripsLeadingZero: false },
  { iso: "PH", name: "Philippines", dialCode: "+63", stripsLeadingZero: true },
  { iso: "PK", name: "Pakistan", dialCode: "+92", stripsLeadingZero: true },
  { iso: "BD", name: "Bangladesh", dialCode: "+880", stripsLeadingZero: true },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971", stripsLeadingZero: true },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966", stripsLeadingZero: true },
  { iso: "CN", name: "China", dialCode: "+86", stripsLeadingZero: false },
  { iso: "JP", name: "Japan", dialCode: "+81", stripsLeadingZero: true },
  { iso: "SG", name: "Singapore", dialCode: "+65", stripsLeadingZero: false },
  { iso: "MW", name: "Malawi", dialCode: "+265", stripsLeadingZero: true },
  { iso: "ZM", name: "Zambia", dialCode: "+260", stripsLeadingZero: true },
  { iso: "BW", name: "Botswana", dialCode: "+267", stripsLeadingZero: false },
  { iso: "MZ", name: "Mozambique", dialCode: "+258", stripsLeadingZero: false },
];

export const DEFAULT_COUNTRY_ISO = "US";

/**
 * Combines a selected country's dial code with a locally-typed number into
 * a valid E.164 string (e.g. "+263771234567"). Strips all non-digit
 * characters from the local number first (spaces, dashes, parens are all
 * common in how people type numbers), then drops one leading zero if the
 * country's convention requires it.
 */
export function toE164(country: CountryOption, localNumber: string): string {
  let digits = localNumber.replace(/\D/g, "");
  if (country.stripsLeadingZero && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return `${country.dialCode}${digits}`;
}
