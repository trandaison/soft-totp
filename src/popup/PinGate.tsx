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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        padding: '40px 24px',
        background: colors.bg,
      }}
    >
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        style={{
          width: '64px',
          height: '64px',
          marginBottom: '8px',
        }}
      >
        <path
          fill-rule='evenodd'
          clip-rule='evenodd'
          d='M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM8 17C8.55228 17 9 16.5523 9 16C9 15.4477 8.55228 15 8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17ZM17 16C17 16.5523 16.5523 17 16 17C15.4477 17 15 16.5523 15 16C15 15.4477 15.4477 15 16 15C16.5523 15 17 15.4477 17 16Z'
          fill='url(#paint0_linear_2110_74)'
        />
        <defs>
          <linearGradient
            id='paint0_linear_2110_74'
            x1='12'
            y1='1.25'
            x2='12'
            y2='22'
            gradientUnits='userSpaceOnUse'
          >
            <stop stop-color='#2E86AB' />
            <stop offset='1' stop-color='#1C274C' />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: '24px',
        }}
      >
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
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type='password'
            inputMode='numeric'
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoComplete='off'
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
