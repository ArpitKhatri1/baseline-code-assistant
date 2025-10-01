import React from 'react'
import type { WebBaselineApiResponse, FeatureData, BrowserSupport } from '../types/types'

interface InfoComponentProps {
    data: WebBaselineApiResponse | undefined
}

export const InfoComponent: React.FC<InfoComponentProps> = ({ data }) => {
    if (!data || data.data.length === 0) return <p className="text-white/60">No data available</p>

    return (
        <div className="space-y-6 mt-2">
            {data.data.map((feature: FeatureData) => (
                <div key={feature.feature_id} className="bg-white/10 p-4 rounded-lg text-white shadow-md">
                    {/* Feature Name and Baseline */}
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold">{feature.name}</h2>
                        <span
                            className={`px-2 py-1 rounded-md text-sm ${feature.baseline.status === 'widely'
                                    ? 'bg-green-500'
                                    : feature.baseline.status === 'limited'
                                        ? 'bg-yellow-500'
                                        : 'bg-blue-500'
                                }`}
                        >
                            {feature.baseline.status.toUpperCase()}
                        </span>
                    </div>

                    {/* Browser Implementations */}
                    {feature.browser_implementations && Object.keys(feature.browser_implementations).length > 0 && (
                        <div className="mb-2">
                            <h3 className="font-semibold underline">Browser Support:</h3>
                            <ul className="list-disc list-inside">
                                {(Object.entries(feature.browser_implementations) as [string, BrowserSupport | undefined][]).map(
                                    ([browser, support]) =>
                                        support && (
                                            <li key={browser}>
                                                {browser}: {support.status} (v{support.version}, {support.date})
                                            </li>
                                        )
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Spec Links */}
                    {feature.spec.links.length > 0 && (
                        <div className="mb-2">
                            <h3 className="font-semibold underline">Spec Links:</h3>
                            <ul className="list-disc list-inside">
                                {feature.spec.links.map((link, idx) => (
                                    <li key={idx}>
                                        <a
                                            href={link.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-300 underline"
                                        >
                                            {link.link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {feature.usage && Object.keys(feature.usage).length > 0 && (
                        <div>
                            <h3 className="font-semibold underline">Usage:</h3>
                            <ul className="list-disc list-inside">
                                {(Object.entries(feature.usage) as [string, { daily?: number }][]).map(
                                    ([browser, usageData]) => (
                                        <li key={browser}>
                                            {browser}:{' '}
                                            {typeof usageData.daily === 'number' ? usageData.daily.toFixed(2) + '% daily' : 'N/A'}
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
