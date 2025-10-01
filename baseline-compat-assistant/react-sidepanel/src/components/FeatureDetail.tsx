import React from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { FeatureData, BrowserSupport } from '../types/types'
import chrome_icon from './../../public/chrome_32x32.png'
import edge_icon from './../../public/edge_32x32.png'
import firefox_icon from './../../public/firefox_32x32.png'
import safari_icon from './../../public/safari_32x32.png'

interface FeatureDetailProps {
    feature: FeatureData
    onBack: () => void
}

import widely_icon from '../../public/check.svg'
import newly_icon from '../../public/newly.svg'
import limited_icon from "../../public/cross.svg"

export const FeatureDetail: React.FC<FeatureDetailProps> = ({ feature, onBack }) => {


    const browserIcons: { [key: string]: string } = {
        chrome: chrome_icon,
        chrome_android: chrome_icon,
        edge: edge_icon,
        firefox: firefox_icon,
        firefox_android: firefox_icon,
        safari: safari_icon,
        safari_ios: safari_icon,
    }

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 group"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to features</span>
            </button>

            <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{feature.name}</h1>
                        <p className="text-neutral-400 text-sm">Feature ID: {feature.feature_id}</p>
                    </div>
                    <div className='flex items-center justify-center'>
                        <span
                            className={` text-white text-sm font-medium px-4 py-2 rounded-full`}
                        >
                            {feature.baseline.status[0].toUpperCase() + feature.baseline.status.slice(1)} {feature.baseline.status === "limited" ? "Availiblity" : "Available"}
                        </span>
                        <img src={feature.baseline.status === "widely" ? widely_icon : feature.baseline.status === "newly" ? newly_icon : limited_icon} width={40} className='h-7' />
                    </div>

                </div>

                {feature.browser_implementations && Object.keys(feature.browser_implementations).length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Browser Support</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Object.entries(feature.browser_implementations) as [string, BrowserSupport | undefined][]).map(
                                ([browser, support]) =>
                                    support && (
                                        <div
                                            key={browser}
                                            className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4"
                                        >


                                            <div className='flex justify-between'>
                                                <h3 className="text-white font-medium mb-2 capitalize">{browser.replace('_', ' ')}</h3>
                                                {browserIcons[browser] && (
                                                    <img
                                                        src={browserIcons[browser]}
                                                        alt={`${browser} icon`}
                                                        className="w-6 h-6" // Adjust size as needed
                                                    />
                                                )}

                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-400">Status:</span>
                                                    <span className="text-neutral-200">{support.status[0].toUpperCase() + support.status.slice(1)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-400">Available from Version:</span>
                                                    <span className="text-neutral-200">{support.version}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-400">Available Since:</span>
                                                    <span className="text-neutral-200">{support.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                            )}
                        </div>
                    </div>
                )}

                {feature.spec.links.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Specification Links</h2>
                        <div className="space-y-2">
                            {feature.spec.links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group"
                                >
                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    <span className="break-all">{link.link}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {feature.usage && Object.keys(feature.usage).length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Usage Statistics</h2>
                        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
                            <div className="space-y-3">
                                {(Object.entries(feature.usage) as [string, { daily?: number }][]).map(
                                    ([browser, usageData]) => (
                                        <div key={browser} className="flex justify-between items-center">
                                            <span className="text-neutral-300 capitalize">{browser.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 bg-neutral-700 rounded-full h-2">
                                                    <div
                                                        className="bg-sky-500 h-2 rounded-full transition-all"
                                                        style={{
                                                            width: `${typeof usageData.daily === 'number' ? Math.min(usageData.daily * 10, 100) : 0}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-neutral-200 text-sm w-16 text-right">
                                                    {typeof usageData.daily === 'number' ? usageData.daily.toFixed(2) + '%' : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
