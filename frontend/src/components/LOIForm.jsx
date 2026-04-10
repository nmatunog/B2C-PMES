export function LOIForm({
  formData,
  loiData,
  setLoiData,
  error,
  loading,
  onSubmit,
  onBack,
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-3xl border-2 border-[#004aad]/10 bg-blue-50 p-8">
        <p className="text-xl font-bold">Name: {formData.fullName}</p>
        <p className="text-xl font-bold">Contact: {formData.email}</p>
      </div>

      <input
        type="text"
        className="input-field"
        placeholder="Full Residential Address"
        value={loiData.address}
        onChange={(event) => setLoiData({ ...loiData, address: event.target.value })}
      />

      <div className="grid grid-cols-2 gap-6">
        <input
          type="text"
          className="input-field"
          placeholder="Occupation"
          value={loiData.occupation}
          onChange={(event) => setLoiData({ ...loiData, occupation: event.target.value })}
        />
        <input
          type="text"
          className="input-field"
          placeholder="Employer"
          value={loiData.employer}
          onChange={(event) => setLoiData({ ...loiData, employer: event.target.value })}
        />
      </div>

      <input
        type="number"
        className="input-field"
        placeholder="Initial Share Capital (PHP)"
        value={loiData.initialCapital}
        onChange={(event) => setLoiData({ ...loiData, initialCapital: event.target.value })}
      />

      <div className="flex items-start gap-6 rounded-3xl border-4 border-dashed bg-slate-50 p-8">
        <input
          type="checkbox"
          className="mt-1 h-10 w-10"
          checked={loiData.agreement}
          onChange={(event) => setLoiData({ ...loiData, agreement: event.target.checked })}
          id="loi-check"
        />
        <label htmlFor="loi-check" className="text-xl font-bold italic leading-relaxed text-slate-600">
          "I hereby express my sincere intent to join B2C Consumers Cooperative. I have completed the PMES and
          understood the principles."
        </label>
      </div>

      {error && <div className="font-black text-red-600">{error}</div>}

      <button onClick={onSubmit} disabled={loading} className="btn-primary w-full py-8 text-3xl font-black uppercase tracking-tighter">
        SUBMIT INTENT
      </button>
      <button onClick={onBack} className="w-full text-center font-bold text-slate-400">
        Back
      </button>
    </div>
  );
}
