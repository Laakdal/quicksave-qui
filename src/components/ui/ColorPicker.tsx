import { useState, useEffect, useRef } from "react";

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor: string;
  onApply: (r: number, g: number, b: number) => void;
}

function hsvToRgb(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

export function ColorPicker({ isOpen, onClose, initialColor, onApply }: ColorPickerProps) {
  const [hsv, setHsv] = useState([0, 1, 1]);
  const [initialHsv, setInitialHsv] = useState([0, 1, 1]);
  const [tempHex, setTempHex] = useState<string | null>(null);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialColor) {
      const parts = initialColor.split(' ').map(Number);
      if (parts.length === 3) {
        const val = rgbToHsv(parts[0], parts[1], parts[2]);
        setHsv(val);
        setInitialHsv(val);
      }
    }
  }, [isOpen, initialColor]);

  if (!isOpen) return null;

  const [r, g, b] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  const derivedHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  const displayHex = tempHex !== null ? tempHex : derivedHex;

  const [initR, initG, initB] = hsvToRgb(initialHsv[0], initialHsv[1], initialHsv[2]);
  const initHex = "#" + ((1 << 24) + (initR << 16) + (initG << 8) + initB).toString(16).slice(1);

  const [baseR, baseG, baseB] = hsvToRgb(hsv[0], hsv[1], 1);
  const baseHex = "#" + ((1 << 24) + (baseR << 16) + (baseG << 8) + baseB).toString(16).slice(1);

  const updateSpectrum = (clientX: number, clientY: number) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));
    const newH = (x / rect.width) * 360;
    const newS = 1 - (y / rect.height);
    setHsv(prev => [newH, newS, prev[2]]);
    setTempHex(null);
  };

  const updateSlider = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const newV = x / rect.width;
    setHsv(prev => [prev[0], prev[1], newV]);
    setTempHex(null);
  };

  const handleSpectrumMouseDown = (e: React.MouseEvent) => {
    updateSpectrum(e.clientX, e.clientY);
    const onMouseMove = (moveEvent: MouseEvent) => updateSpectrum(moveEvent.clientX, moveEvent.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    updateSlider(e.clientX);
    const onMouseMove = (moveEvent: MouseEvent) => updateSlider(moveEvent.clientX);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updateRgb = (type: 'r' | 'g' | 'b', value: number) => {
    let newR = r, newG = g, newB = b;
    if (type === 'r') newR = value;
    if (type === 'g') newG = value;
    if (type === 'b') newB = value;
    setHsv(rgbToHsv(newR, newG, newB));
    setTempHex(null);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempHex(val);

    const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(val);
    if (match) {
      let hexStr = match[1];
      if (hexStr.length === 3) {
        hexStr = hexStr.split('').map(c => c + c).join('');
      }
      const newR = parseInt(hexStr.slice(0, 2), 16);
      const newG = parseInt(hexStr.slice(2, 4), 16);
      const newB = parseInt(hexStr.slice(4, 6), 16);
      setHsv(rgbToHsv(newR, newG, newB));
    }
  };

  const handleHexBlur = () => {
    setTempHex(null);
  };

  const thumbX = (hsv[0] / 360) * 100;
  const thumbY = (1 - hsv[1]) * 100;
  const sliderX = hsv[2] * 100;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="w-[380px] rounded-xl shadow-2xl overflow-hidden flex flex-col select-none" style={{ backgroundColor: '#282828', color: '#e3e3e3', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="p-6 pb-4">
          <h2 className="text-sm font-medium mb-5">Choose Theme color</h2>

          <div className="flex gap-3 mb-5">
            <div
              ref={spectrumRef}
              onMouseDown={handleSpectrumMouseDown}
              className="flex-1 h-40 rounded-md relative cursor-crosshair shadow-inner"
              style={{
                background: 'linear-gradient(to bottom, transparent, white), linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)'
              }}
            >
              <div
                className="absolute w-3.5 h-3.5 rounded-full border-[2.5px] border-black shadow-sm pointer-events-none"
                style={{ left: `${thumbX}%`, top: `${thumbY}%`, transform: 'translate(-50%, -50%)', backgroundColor: baseHex }}
              />
            </div>

            <div className="w-8 h-40 rounded-md relative shadow-inner overflow-hidden flex flex-col">
              <div className="flex-1" style={{ backgroundColor: derivedHex }} />
              <div className="flex-1" style={{ backgroundColor: initHex }} />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/40 -translate-y-1/2" />
            </div>
          </div>

          <div
            ref={sliderRef}
            onMouseDown={handleSliderMouseDown}
            className="h-3 rounded-full relative mb-6 shadow-inner cursor-pointer"
            style={{ background: `linear-gradient(to right, black, ${baseHex})` }}
          >
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full bg-white border border-black/20 shadow-sm pointer-events-none"
              style={{ left: `${sliderX}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          <div className="flex justify-between items-center mb-5">
            <span className="text-sm">Edit Color</span>
            <input
              type="text"
              value={displayHex}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              className="w-24 px-3 py-1 bg-black/20 rounded text-sm border border-white/5 text-center font-mono outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Red', type: 'r' as 'r', val: r },
              { label: 'Green', type: 'g' as 'g', val: g },
              { label: 'Blue', type: 'b' as 'b', val: b }
            ].map(color => (
              <div key={color.label} className="flex items-center gap-3">
                <input
                  type="number"
                  value={color.val}
                  onChange={(e) => updateRgb(color.type, Math.max(0, Math.min(255, Number(e.target.value))))}
                  className="w-24 px-3 py-1 bg-black/20 rounded text-sm border border-white/5 outline-none focus:border-accent/50 transition-colors"
                />
                <span className="text-sm opacity-80">{color.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 p-6 pt-2">
          <button
            onClick={() => { onApply(r, g, b); onClose(); }}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: derivedHex, color: (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000' : '#fff' }}
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
