"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

export default function MmrChart({ data, queues }: { data: any[], queues: string[] }) {
    if (data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-slate-500 italic">Pas assez de données pour générer la courbe.</div>;
    }

    return (
        <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />

                    {queues.map((q, idx) => (
                        <Line
                            key={q}
                            type="monotone"
                            dataKey={q}
                            name={q}
                            stroke={PALETTE[idx % PALETTE.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: PALETTE[idx % PALETTE.length] }}
                            connectNulls // Relie les points même s'il y a eu d'autres parties entre-temps !
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}