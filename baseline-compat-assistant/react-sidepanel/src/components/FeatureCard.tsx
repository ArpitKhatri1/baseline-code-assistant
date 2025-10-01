import React from 'react'
import type { FeatureData } from '../types/types'
import widely_icon from '../../public/check.svg'
import newly_icon from '../../public/newly.svg'
import limited_icon from "../../public/cross.svg"
interface FeatureCardProps {
  feature: FeatureData
  onClick: () => void
}


export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onClick }) => {


  return (
    <div
      onClick={onClick}
      className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-neutral-500 hover:shadow-lg hover:shadow-neutral-900/50 hover:scale-[1.02] group"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-neutral-100 transition-colors line-clamp-1">
          {feature.name}
        </h3>
        <span
          className={` text-white text-xs font-medium px-3 py-1 rounded-full flex gap-2`}
        >
          {feature.baseline.status.toUpperCase()}
          <img src = {feature.baseline.status === "widely" ? widely_icon : feature.baseline.status === "newly" ? newly_icon : limited_icon} width={25}/>
        </span>
      </div>

     
    </div>
  )
}
