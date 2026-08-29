"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY_ISO, toE164, type CountryOption } from "@/lib/phoneCountries";

interface PhoneInputProps {
  /** Called with a properly formatted E.164 number every time it changes. */
  onChange: (e164: string) => void;
  required?: boolean;
}

const STORAGE_KEY = "paycore_last_country_iso";

export function PhoneInput({ onChange, required }: PhoneInputProps) {
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [localNumber, setLocalNumber] = useState("");

  // Remember the user's last-selected country so returning users (or a
  // second account on the same device) don't have to re-pick it every time.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && COUNTRIES.some((c) => c.iso === saved)) {
      setCountryIso(saved);
    }
  }, []);

  const country = COUNTRIES.find((c) => c.iso === countryIso) ?? COUNTRIES[0];

  useEffect(() => {
    onChange(localNumber ? toE164(country, localNumber) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso, localNumber]);

  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, iso);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="phone-local" className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Phone number
      </label>
      <div className="flex gap-2">
        <select
          value={countryIso}
          onChange={(e) => handleCountryChange(e.target.value)}
          aria-label="Country"
          className="w-[7.5rem] shrink-0 rounded-xl border border-slate-200 bg-white/70 px-2 py-2.5 text-sm text-slate-900 backdrop-blur-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
        >
          {COUNTRIES.map((c: CountryOption) => (
            <option key={c.iso} value={c.iso}>
              {c.dialCode} {c.iso}
            </option>
          ))}
        </select>
        <input
          id="phone-local"
          type="tel"
          inputMode="numeric"
          required={required}
          placeholder={country.stripsLeadingZero ? "0771 234 567" : "415 555 1234"}
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
        />
      </div>
      <p className="text-xs text-slate-400">
        Enter your number as you'd normally dial it locally — no need to type {country.dialCode} yourself.
      </p>
    </div>
  );
}
