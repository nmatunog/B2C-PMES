import { BadgeCheck } from "lucide-react";

export function Certificate({ record }) {
  const dateStr = record?.timestamp
    ? new Date(record.timestamp).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString();

  return (
    <div className="certificate-container relative mx-auto my-4 max-w-4xl overflow-hidden rounded-[3rem] border-[24px] border-double border-[#004aad] bg-white p-12 text-center shadow-2xl print:m-0 print:rounded-none print:border-[20px] print:shadow-none">
      <div className="absolute right-0 top-0 -mr-40 -mt-40 h-80 w-80 rounded-full border-4 border-[#004aad]/10 bg-[#004aad]/5" />
      <div className="relative z-10 space-y-10">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-[#004aad] p-4 text-xl font-black text-white shadow-lg">B2C</div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#004aad]">B2C Consumers Cooperative</h2>
        </div>
        <h1 className="font-serif text-6xl font-black text-slate-800">Certificate of Completion</h1>
        <p className="text-2xl font-bold italic text-slate-500">This official document is awarded to</p>
        <h3 className="inline-block border-b-8 border-slate-100 px-8 pb-4 text-7xl font-black text-[#004aad]">
          {record?.fullName}
        </h3>
        <p className="px-16 text-2xl font-medium leading-relaxed text-slate-700">
          for completing the <strong>Pre-Membership Education Seminar (PMES)</strong> and achieving a passing
          assessment grade.
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-12 border-t-2 border-slate-100 pt-12">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Issued Date</p>
            <p className="text-xl font-black text-slate-800">{dateStr}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">ID Code</p>
            <p className="text-xl font-black text-slate-800">B2C-{record?.id?.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 pt-8 opacity-40">
          <BadgeCheck className="h-10 w-10 text-[#004aad]" />
          <span className="text-sm font-black uppercase tracking-widest text-slate-600">Official Database Verified</span>
        </div>
      </div>
    </div>
  );
}
