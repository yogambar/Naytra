import React, { useId, useState, useEffect, useRef } from 'react';
import { MapPin, X, Check, Loader2 } from 'lucide-react';
import { getCityTrie, CityMatch } from '../../utils/cityTrie';
import { hapticTick } from '../../utils/haptics';

export interface CityAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Reverse-geocodes GPS coordinates into a city name using free, client-side APIs.
 */
async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<{ city: string; state?: string } | null> {
  // 1. Try BigDataCloud free client reverse geocoding API
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const detectedCity = data.city || data.locality || data.principalSubdivision;
      if (detectedCity) {
        return {
          city: detectedCity,
          state: data.principalSubdivision,
        };
      }
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const detectedCity =
        addr.city || addr.town || addr.village || addr.county || addr.state_district;
      if (detectedCity) {
        return {
          city: detectedCity,
          state: addr.state,
        };
      }
    }
  } catch {
    // Failed all reverse geocoding attempts
  }

  return null;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  id: customId,
  label = 'City (Optional)',
  value,
  onChange,
  placeholder = 'e.g. Mumbai or Dehradun',
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<CityMatch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input value if prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    onChange(text);
    setLocationMessage(null);

    if (text.trim().length >= 1) {
      const trie = getCityTrie();
      const matches = trie.search(text.trim(), 6);
      setSuggestions(matches);
      setIsOpen(matches.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (city: string) => {
    setInputValue(city);
    onChange(city);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    setLocationMessage(null);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setLocationMessage(null);
    inputRef.current?.focus();
  };

  // GPS Auto-detect via pin click
  const handleLocateMe = () => {
    if (disabled || isLocating) return;

    setLocationMessage(null);

    if (!('geolocation' in navigator) || !navigator.geolocation) {
      setLocationMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser. Please type your city.',
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const result = await reverseGeocodeCity(latitude, longitude);

          if (result && result.city) {
            // Check if Trie has a canonical name for this city
            const trie = getCityTrie();
            const matches = trie.search(result.city, 1);
            const canonicalCity =
              matches.length > 0 &&
              matches[0].city.toLowerCase() === result.city.toLowerCase()
                ? matches[0].city
                : result.city;

            setInputValue(canonicalCity);
            onChange(canonicalCity);
            setIsOpen(false);
            hapticTick();
            setLocationMessage({
              type: 'success',
              text: `Detected: ${canonicalCity}${result.state ? ` (${result.state})` : ''}`,
            });
          } else {
            setLocationMessage({
              type: 'error',
              text: 'Could not determine city name from GPS. Please type manually.',
            });
          }
        } catch {
          setLocationMessage({
            type: 'error',
            text: 'Location lookup failed. Please type manually.',
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationMessage({
            type: 'error',
            text: 'Location permission was denied. Please type your city manually.',
          });
        } else {
          setLocationMessage({
            type: 'error',
            text: 'Unable to retrieve location coordinates. Please type manually.',
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && inputValue.trim().length >= 1) {
        const matches = getCityTrie().search(inputValue.trim(), 6);
        if (matches.length > 0) {
          setSuggestions(matches);
          setIsOpen(true);
          setHighlightedIndex(0);
          e.preventDefault();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex].city);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Helper to highlight matching text
  const renderHighlightedCity = (city: string, query: string) => {
    const lowerCity = city.toLowerCase();
    const lowerQuery = query.trim().toLowerCase();
    const idx = lowerCity.indexOf(lowerQuery);

    if (idx === -1 || !lowerQuery) {
      return <span>{city}</span>;
    }

    const before = city.slice(0, idx);
    const match = city.slice(idx, idx + lowerQuery.length);
    const after = city.slice(idx + lowerQuery.length);

    return (
      <span>
        {before}
        <strong className="text-brand-marigold font-bold underline decoration-brand-marigold/40">
          {match}
        </strong>
        {after}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col gap-1.5 text-left ${className}`}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text-secondary tracking-wide select-none"
        >
          {label} {required && <span className="text-brand-down">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center w-full rounded-xl transition-all duration-200 border bg-surface-inset text-text-primary ${
          error
            ? 'border-brand-down ring-1 ring-brand-down/40'
            : 'border-surface-border-subtle focus-within:border-brand-marigold focus-within:ring-2 focus-within:ring-brand-marigold/30 focus-within:bg-surface-raised'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ boxShadow: 'var(--shadow-inset)' }}
      >
        {/* Clickable GPS Location Pin */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={disabled || isLocating}
          title="Click to auto-detect your city via GPS"
          aria-label="Auto-detect current city via GPS"
          className="pl-3.5 pr-1.5 py-1 text-brand-marigold hover:text-brand-marigold-hover focus:outline-none transition-transform active:scale-90 select-none shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-marigold" />
          ) : (
            <MapPin className="w-4 h-4 text-brand-marigold hover:scale-110 transition-transform" />
          )}
        </button>

        {/* City Input for Manual Typing */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="address-level2"
          disabled={disabled || isLocating}
          placeholder={isLocating ? 'Detecting your location...' : placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length >= 1) {
              const matches = getCityTrie().search(inputValue.trim(), 6);
              setSuggestions(matches);
              setIsOpen(matches.length > 0);
            }
          }}
          className="w-full h-11 min-h-[44px] px-2 bg-transparent text-sm placeholder:text-text-tertiary outline-none disabled:cursor-not-allowed"
          aria-label="City Autocomplete or GPS location"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />

        {/* Clear Button */}
        {inputValue.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-3 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-border/30 transition-colors shrink-0"
            aria-label="Clear city"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute z-50 top-[100%] left-0 right-0 mt-1.5 py-1.5 rounded-xl bg-surface-raised border border-surface-border shadow-xl backdrop-blur-md overflow-hidden max-h-60 overflow-y-auto"
          style={{ boxShadow: 'var(--shadow-e3)' }}
        >
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-text-tertiary border-b border-surface-border/40 mb-1">
            Indian Cities (Trie Matches)
          </div>
          {suggestions.map((item, idx) => {
            const isSelected = idx === highlightedIndex;
            const isCurrent =
              inputValue.trim().toLowerCase() === item.city.toLowerCase();

            return (
              <div
                key={`${item.city}-${item.state}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(item.city)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`px-3.5 py-2 cursor-pointer flex items-center justify-between transition-colors text-sm ${
                  isSelected
                    ? 'bg-surface-inset text-text-primary'
                    : 'text-text-secondary hover:bg-surface-inset'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-text-primary">
                    {renderHighlightedCity(item.city, inputValue)}
                  </span>
                  <span className="text-xs text-text-tertiary font-normal">
                    • {item.state}
                  </span>
                </div>
                {isCurrent && <Check className="w-3.5 h-3.5 text-brand-up" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Geolocation feedback / Error feedback */}
      {locationMessage ? (
        <p
          role="status"
          className={`text-xs font-medium flex items-center gap-1 ${
            locationMessage.type === 'success' ? 'text-brand-up' : 'text-text-tertiary'
          }`}
        >
          {locationMessage.type === 'success' && (
            <Check className="w-3 h-3 text-brand-up" />
          )}
          {locationMessage.text}
        </p>
      ) : error ? (
        <p
          role="alert"
          className="text-xs text-brand-down font-medium flex items-center gap-1"
        >
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
};
