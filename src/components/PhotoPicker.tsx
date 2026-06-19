// Bouton "Prendre une photo" + grille de miniatures supprimables.

import { capturePhoto } from '../lib/photos';

export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  required,
  missing,
  label,
}: {
  photos: string[];
  onAdd: (dataUrl: string) => void;
  onRemove: (idx: number) => void;
  required?: boolean;
  missing?: boolean;
  label?: string;
}) {
  const handleClick = async () => {
    const dataUrl = await capturePhoto();
    if (dataUrl) onAdd(dataUrl);
  };
  return (
    <div className="photo-area">
      <button type="button" className="btn-photo" onClick={handleClick}>📸 {label || 'Prendre une photo'}</button>
      {required && missing && <span className="photo-need">Photo obligatoire</span>}
      <div className="thumbs">
        {photos.map((src, i) => (
          <div key={i} className="thumb">
            <img src={src} alt={`photo ${i + 1}`} />
            <div className="x" onClick={() => onRemove(i)}>×</div>
          </div>
        ))}
      </div>
    </div>
  );
}
