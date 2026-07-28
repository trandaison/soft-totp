import { useState, useRef, useEffect } from 'react';
import { LOGOS, getLogoById, findLogoForAccount, issuerToDomain } from '../lib/logos';

interface LogoPickerProps {
  logoId?: string;
  issuer?: string;
  urlPatterns?: string[];
  faviconUrl?: string;
  onSelect: (logoId: string | undefined) => void;
  size?: number;
}

export function LogoPicker({ logoId, issuer, urlPatterns, faviconUrl, onSelect, size = 48 }: LogoPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [fetchedFavicon, setFetchedFavicon] = useState<string | undefined>(undefined);

  const selectedLogo = logoId ? getLogoById(logoId) : undefined;
  const autoLogo = findLogoForAccount(issuer || '', urlPatterns);
  const effectiveFavicon = fetchedFavicon || faviconUrl;
  const displayFavicon = !selectedLogo && effectiveFavicon;
  const displayLogo = selectedLogo || (!effectiveFavicon ? autoLogo : undefined);

  const iconSize = Math.round(size * 0.67);

  useEffect(() => {
    if (!issuer) {
      setFetchedFavicon(undefined);
      return;
    }
    const domain = issuerToDomain(issuer);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    let cancelled = false;
    fetch(faviconUrl)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setFetchedFavicon(faviconUrl);
        } else {
          setFetchedFavicon(undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedFavicon(undefined);
      });
    return () => { cancelled = true; };
  }, [issuer]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      <div
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          border: '2px dashed #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: '#f9f9f9',
          transition: 'all 0.2s',
          overflow: 'hidden',
        }}
        title="Click to change logo"
      >
        {displayLogo ? (
          <img
            src={displayLogo.file}
            alt={displayLogo.name}
            style={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
          />
        ) : displayFavicon ? (
          <img
            src={displayFavicon}
            alt="Website favicon"
            style={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: Math.round(size * 0.35), fontWeight: 'bold', color: '#999' }}>
            {issuer?.charAt(0)?.toUpperCase() || 'L'}
          </span>
        )}
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '8px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '12px',
            zIndex: 1000,
            minWidth: '240px',
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {LOGOS.map((logo) => {
              const isSelected = logoId === logo.id;
              const isAuto = !logoId && autoLogo?.id === logo.id;
              return (
                <div
                  key={logo.id}
                  onClick={() => {
                    onSelect(isSelected ? undefined : logo.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #3498db' : isAuto ? '2px solid #2ecc71' : '2px solid transparent',
                    background: isSelected ? '#ebf5fb' : isAuto ? '#eafaf1' : '#f9f9f9',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  <img
                    src={logo.file}
                    alt={logo.name}
                    style={{ width: '28px', height: '28px', objectFit: 'contain', marginBottom: '4px' }}
                  />
                  <span style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                    {logo.name}
                  </span>
                  {(isSelected || isAuto) && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: isSelected ? '#3498db' : '#2ecc71',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {logoId && (
            <div
              onClick={() => { onSelect(undefined); setIsOpen(false); }}
              style={{
                marginTop: '8px',
                padding: '6px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#e74c3c',
                cursor: 'pointer',
                borderRadius: '6px',
                background: '#fdf2f2',
              }}
            >
              Reset to auto-detect
            </div>
          )}
        </div>
      )}
    </div>
  );
}
