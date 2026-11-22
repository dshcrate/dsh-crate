/**
 * The Plugin Crate logo mark and the GitHub repo mark.
 */

import { useId, type CSSProperties } from 'react'
import { MARK_FRAME, MARK_PATH_D, MARK_STROKE_WIDTH, MARK_VIEW_BOX } from './market-mark.ts'
import css from './Market.module.css'

/**
 * 品牌标记：16 视口的线条箱子，颜色取容器上的 currentColor。
 *
 * - `animated` — 加载态。动效本身就是信号，减少动态效果时只放慢、不位移。
 * - `ambient` — 页面标题旁的标记。纯装饰，减少动态效果时直接不扫光。
 * - `inset` — 宿主菜单槽位内缩。只缩放字形，不改变 svg 占位尺寸，让箱子
 *   与相邻菜单图标的墨迹大小和左边缘对齐。
 *
 * 内容页标题与加载态叠加一条 3s 一次的扫光：25° 斜向、半高宽约图标 27% 的
 * 高斯光带在 mask 内从左侧外扫到右侧外，0.9s 扫完（30% 处到位），其余 2.1s
 * 停在画面外。只动 transform，没有滤镜，也不引起布局。
 */
export function MarketLogo({ size = 16, style, animated = false, ambient = false, inset = 0 }: {
  size?: number
  style?: CSSProperties
  animated?: boolean
  ambient?: boolean
  inset?: number
}) {
  const sweeping = animated || ambient
  const uid = useId().replace(/:/gu, '')
  const maskId = `dshm-crate-mask-${uid}`
  const sweepId = `dshm-crate-sweep-${uid}`
  // 宿主菜单图标在 16 槽位里四周留 2，箱子是满幅的；不内缩会比兄弟项大一圈、
  // 左边缘也更靠左。inset 只把字形按比例收进槽位中心，svg 占位尺寸不变。
  const glyphTransform = inset > 0
    ? `translate(${MARK_VIEW_BOX / 2} ${MARK_VIEW_BOX / 2}) scale(${(MARK_VIEW_BOX - inset * 2) / (MARK_VIEW_BOX - 1)}) translate(-${MARK_VIEW_BOX / 2} -${MARK_VIEW_BOX / 2})`
    : undefined
  const glyph = (
    <>
      <rect x={MARK_FRAME.x} y={MARK_FRAME.y} width={MARK_FRAME.width} height={MARK_FRAME.height} />
      <path d={MARK_PATH_D} />
    </>
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${MARK_VIEW_BOX} ${MARK_VIEW_BOX}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={style}>
      <g fill="none" stroke="currentColor" strokeWidth={MARK_STROKE_WIDTH} strokeLinecap="butt" strokeLinejoin="miter" transform={glyphTransform}>
        {glyph}
      </g>
      {sweeping && (
        <>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={MARK_VIEW_BOX} height={MARK_VIEW_BOX}>
              <g fill="none" stroke="#fff" strokeWidth={MARK_STROKE_WIDTH} strokeLinecap="butt" strokeLinejoin="miter" transform={glyphTransform}>
                {glyph}
              </g>
            </mask>
            <linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.1" stopColor="#fff" stopOpacity="0.003" />
              <stop offset="0.2" stopColor="#fff" stopOpacity="0.036" />
              <stop offset="0.3" stopColor="#fff" stopOpacity="0.216" />
              <stop offset="0.4" stopColor="#fff" stopOpacity="0.63" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.6" stopColor="#fff" stopOpacity="0.63" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0.216" />
              <stop offset="0.8" stopColor="#fff" stopOpacity="0.036" />
              <stop offset="0.9" stopColor="#fff" stopOpacity="0.003" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g mask={`url(#${maskId})`}>
            <g className={css.logoSweep}>
              <rect x="0" y="-8" width="11" height="32" fill={`url(#${sweepId})`} transform="rotate(25 8 8)" />
            </g>
          </g>
        </>
      )}
    </svg>
  )
}

/**
 * GitHub mark beside catalog card titles (#256, #365). Catalog intake
 * rejects any entry whose `url` is not
 * `https://github.com/owner/repo` (scripts/lib/entries.mjs), so this renders
 * unconditionally — not a bet that today's snapshot happens to be all
 * GitHub. The generic outbound arrow did not say so until hover. This rides
 * the title's own line — no second link, no extra row.
 */
export function GithubRepoMark({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}
