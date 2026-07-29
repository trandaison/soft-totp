import { useState, useEffect } from 'react';
import { registerCredential, authenticateCredential } from '../lib/webauthn';
import { colors } from '../lib/colors';

interface PinSettingsProps {
  onPinStatusChange?: (isSetup: boolean) => void;
}

export function PinSettings({ onPinStatusChange }: PinSettingsProps) {
  const [isSetup, setIsSetup] = useState(false);
  const [mode, setMode] = useState<'idle' | 'setup' | 'change' | 'remove'>('idle');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'GET_PIN_CONFIG' });
    const setup = response?.config?.isSetup ?? false;
    setIsSetup(setup);
    onPinStatusChange?.(setup);
  };

  const resetForm = () => {
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setError('');
    setSuccess('');
    setMode('idle');
  };

  const handleSetup = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN phải gồm 6 chữ số');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await registerCredential();
      const response = await chrome.runtime.sendMessage({
        action: 'SETUP_PIN',
        payload: { pin, credential },
      });

      if (response.success) {
        setSuccess('PIN đã được tạo thành công');
        setIsSetup(true);
        onPinStatusChange?.(true);
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi tạo PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi đăng ký sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async () => {
    if (oldPin.length !== 6) {
      setError('Nhập PIN hiện tại');
      return;
    }
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN mới phải gồm 6 chữ số');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN mới không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const assertion = await authenticateCredential('');
      const response = await chrome.runtime.sendMessage({
        action: 'RESET_PIN',
        payload: { oldPin, newPin: pin, assertion },
      });

      if (response.success) {
        setSuccess('PIN đã được cập nhật');
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi cập nhật PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi xác thực sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (pin.length !== 6) {
      setError('Nhập PIN hiện tại');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const assertion = await authenticateCredential('');
      const response = await chrome.runtime.sendMessage({
        action: 'REMOVE_PIN',
        payload: { pin, assertion },
      });

      if (response.success) {
        setSuccess('PIN đã được xóa');
        setIsSetup(false);
        onPinStatusChange?.(false);
        setTimeout(resetForm, 2000);
      } else {
        setError(response.error || 'Lỗi xóa PIN');
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi xác thực sinh trắc học');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'monospace',
    letterSpacing: '8px',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      background: colors.bgCard,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      border: `1px solid ${colors.border}`,
    }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: 600,
        color: colors.textPrimary,
      }}>
        🔒 PIN Security
      </h2>

      {mode === 'idle' && (
        <div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
            {isSetup
              ? 'PIN đang được bật. TOTP autofill sẽ yêu cầu PIN trước khi fill.'
              : 'PIN chưa được thiết lập. TOTP autofill sẽ fill tự động.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isSetup ? (
              <button
                onClick={() => setMode('setup')}
                style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
              >
                Tạo PIN
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode('change')}
                  style={{ ...btnStyle, background: colors.primaryLight, color: '#fff' }}
                >
                  Đổi PIN
                </button>
                <button
                  onClick={() => setMode('remove')}
                  style={{ ...btnStyle, background: colors.error, color: '#fff' }}
                >
                  Xóa PIN
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập PIN 6 số"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập lại PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSetup}
              disabled={loading}
              style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
            >
              {loading ? 'Đang tạo...' : 'Tạo PIN'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN hiện tại"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN mới"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập lại PIN mới"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleChange}
              disabled={loading}
              style={{ ...btnStyle, background: colors.primary, color: '#fff' }}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {mode === 'remove' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: colors.error, fontSize: '14px', margin: 0 }}>
            ⚠️ Xóa PIN sẽ tắt bảo mật cho autofill
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Nhập PIN hiện tại"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRemove}
              disabled={loading}
              style={{ ...btnStyle, background: colors.error, color: '#fff' }}
            >
              {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
            <button
              onClick={resetForm}
              style={{ ...btnStyle, background: colors.borderLight, color: colors.textPrimary }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: colors.error, fontSize: '14px', marginTop: '12px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: colors.success, fontSize: '14px', marginTop: '12px' }}>
          ✅ {success}
        </div>
      )}
    </div>
  );
}
