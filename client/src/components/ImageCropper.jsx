import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * A simple image cropper with zoom + drag-to-pan.
 * Outputs a square cropped image as a Blob.
 */
export default function ImageCropper({ src, onCrop, onCancel, outputSize = 256 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = src;
  }, [src]);

  const VIEWPORT = 240; // Preview square size

  // Draw the image onto the preview canvas
  const draw = useCallback(() => {
    if (!img || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const canvas = canvasRef.current;
    canvas.width = VIEWPORT;
    canvas.height = VIEWPORT;

    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);

    // Scale image so its shortest side fits the viewport, then apply zoom
    const scale = (VIEWPORT / Math.min(img.width, img.height)) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (VIEWPORT - w) / 2 + offset.x;
    const y = (VIEWPORT - h) / 2 + offset.y;

    ctx.drawImage(img, x, y, w, h);
  }, [img, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse / touch drag
  const onPointerDown = (e) => {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => { dragging.current = false; };

  // Zoom with scroll wheel
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(5, z - e.deltaY * 0.002)));
  };

  // Export cropped image
  const handleCrop = () => {
    if (!img) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outputSize;
    outCanvas.height = outputSize;
    const ctx = outCanvas.getContext('2d');

    const scale = (VIEWPORT / Math.min(img.width, img.height)) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (VIEWPORT - w) / 2 + offset.x;
    const y = (VIEWPORT - h) / 2 + offset.y;

    // Map viewport coordinates to output size
    const ratio = outputSize / VIEWPORT;
    ctx.drawImage(img, x * ratio, y * ratio, w * ratio, h * ratio);

    outCanvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/png');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border, #333)',
        borderRadius: '12px', padding: '20px', maxWidth: '340px', width: '100%',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text, #fff)', textAlign: 'center' }}>
          Crop Profile Picture
        </div>

        {/* Preview area */}
        <div ref={containerRef} style={{
          width: VIEWPORT, height: VIEWPORT, margin: '0 auto 12px',
          borderRadius: '8px', overflow: 'hidden', cursor: 'grab',
          border: '2px solid var(--gold-dim, #665522)', position: 'relative',
          background: '#000',
        }}>
          <canvas
            ref={canvasRef}
            width={VIEWPORT} height={VIEWPORT}
            style={{ width: VIEWPORT, height: VIEWPORT, display: 'block' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          />
          {/* Corner guides */}
          {[
            { top: 8, left: 8 }, { top: 8, right: 8 },
            { bottom: 8, left: 8 }, { bottom: 8, right: 8 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', ...pos, width: '20px', height: '20px',
              borderColor: 'var(--gold, #c8a84e)', borderStyle: 'solid', borderWidth: 0,
              ...(pos.top !== undefined && pos.left !== undefined ? { borderTopWidth: 2, borderLeftWidth: 2 } : {}),
              ...(pos.top !== undefined && pos.right !== undefined ? { borderTopWidth: 2, borderRightWidth: 2 } : {}),
              ...(pos.bottom !== undefined && pos.left !== undefined ? { borderBottomWidth: 2, borderLeftWidth: 2 } : {}),
              ...(pos.bottom !== undefined && pos.right !== undefined ? { borderBottomWidth: 2, borderRightWidth: 2 } : {}),
              pointerEvents: 'none',
            }} />
          ))}
        </div>

        {/* Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-dim, #888)' }}>−</span>
          <input
            type="range" min="0.5" max="5" step="0.05" value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--gold, #c8a84e)' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text-dim, #888)' }}>+</span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim, #888)', textAlign: 'center', marginBottom: '12px' }}>
          Drag to reposition · Scroll to zoom
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel}
            style={{ padding: '8px 20px', fontSize: '13px' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCrop}
            style={{ padding: '8px 20px', fontSize: '13px' }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
