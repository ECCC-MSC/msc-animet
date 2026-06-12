export function getLegendScaleFactor(naturalRatio) {
  const vw = window.innerWidth
  const phoneWidth = 480
  const desktopWidth = 1024
  const viewportFactor = Math.max(
    0,
    Math.min(1, (vw - phoneWidth) / (desktopWidth - phoneWidth)),
  )
  const ratioFactor = Math.max(0, Math.min(1, (naturalRatio - 0.5) / 2))
  const minScale = 0.4 + ratioFactor * 0.2
  return minScale + viewportFactor * (1 - minScale)
}
export const BASE62 =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const POS_STEPS = 10001
export const W_STEPS = 50001
