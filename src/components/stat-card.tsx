import React from 'react';

export const StatCard = ({ icon, value, label, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color}`}>
      {React.cloneElement(icon, { className: "w-6 h-6 text-white" })}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
);