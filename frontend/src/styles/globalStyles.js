export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f1f5f9; color: #0f172a; }
  .btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #2563eb 48%, #0ea5e9 100%); color: white; padding: 1.5rem; border-radius: 1.5rem; font-weight: 800; font-size: 1.4rem; transition: all 0.3s; border: none; cursor: pointer; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.28), 0 4px 12px rgba(14, 165, 233, 0.12); display: flex; align-items: center; justify-content: center; gap: 10px; box-sizing: border-box; max-width: 100%; }
  .btn-primary:hover { filter: brightness(1.06); box-shadow: 0 12px 28px rgba(37, 99, 235, 0.32), 0 6px 14px rgba(14, 165, 233, 0.16); }
  .btn-secondary { background-color: white; color: #004aad; border: 4px solid #004aad; padding: 1.5rem; border-radius: 1.5rem; font-weight: 800; font-size: 1.4rem; transition: all 0.3s; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-sizing: border-box; max-width: 100%; }
  .input-field { width: 100%; padding: 1.5rem; background-color: white; border: 4px solid #e2e8f0; border-radius: 1.5rem; font-size: 1.25rem; box-sizing: border-box; font-weight: 600; }
  .card-senior { background-color: white; border-radius: 4rem; box-shadow: 0 40px 80px rgba(0,0,0,0.1); padding: 4rem; border: 10px solid rgba(0, 74, 173, 0.05); box-sizing: border-box; max-width: 100%; overflow-x: clip; }

  @media (max-width: 640px) {
    .btn-primary, .btn-secondary { padding: 1rem 1.1rem; font-size: 1.02rem; border-radius: 1rem; gap: 0.5rem; line-height: 1.25; text-align: center; }
    .input-field { padding: 0.95rem 1rem; font-size: 1rem; border-width: 3px; border-radius: 1rem; }
    .card-senior { padding: 1.25rem; border-width: 6px; border-radius: 1.5rem; }
  }

  @media (max-width: 390px) {
    .btn-primary, .btn-secondary { font-size: 0.95rem; padding: 0.9rem 0.95rem; }
    .card-senior { padding: 1rem; border-radius: 1.25rem; }
  }
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; padding: 0 !important; }
    .certificate-container { border: 24px solid #004aad !important; box-shadow: none !important; margin: 0 !important; width: 100vw !important; height: 100vh !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: center !important; }
  }
`;
