export default function Placeholder({ title, description }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        {description || 'This module will be implemented in a later build step.'}
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Coming soon
      </div>
    </div>
  )
}
