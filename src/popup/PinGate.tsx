import { useState, useEffect, useRef } from 'react';
import { colors } from '../lib/colors';

interface Props {
  onUnlocked: () => void;
}

export function PinGate({ onUnlocked }: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const pin = newDigits.join('');
      if (pin.length === 6) {
        submitPin(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const pin = digits.join('');
      if (pin.length === 6) submitPin(pin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    pasted.split('').forEach((d, i) => { newDigits[i] = d; });
    setDigits(newDigits);
    setError(false);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) submitPin(newDigits.join(''));
  };

  const submitPin = async (pin: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'DO_UNLOCK', payload: { pin } });
      if (response?.success) {
        onUnlocked();
      } else {
        triggerError();
      }
    } catch {
      triggerError();
    }
  };

  const triggerError = () => {
    setError(true);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setDigits(['', '', '', '', '', '']);
      setError(false);
      inputRefs.current[0]?.focus();
    }, 500);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      padding: '40px 24px',
      background: colors.bg,
    }}>
      <div style={{
        fontSize: '32px',
        marginBottom: '16px',
      }}>
        🔒
      </div>
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: colors.textPrimary,
        marginBottom: '24px',
      }}>
        Nhập mã PIN để mở khóa
      </div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          animation: shaking ? 'twofa-shake 0.4s ease-in-out' : 'none',
        }}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoComplete="off"
            style={{
              width: 40,
              height: 48,
              border: `2px solid ${error ? colors.error : 'rgba(0,0,0,0.15)'}`,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.7)',
              color: colors.textPrimary,
              fontSize: 20,
              fontWeight: 600,
              textAlign: 'center',
              outline: 'none',
              fontFamily: 'monospace',
              transition: 'border-color 0.2s',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes twofa-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
