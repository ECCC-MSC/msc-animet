/**
 * Collect the WMS time / reference_time dimension elements for a layer node.
 *
 * WMS 1.3.0 declares time as <Dimension name="time">
 * WMS 1.1.1 declares it as <Extent name="time">
 *
 * @param {Element} node - The leaf layer element from GetCapabilities.
 * @returns {Element[]} The Dimension/Extent elements (time and/or reference_time).
 */
export default function collectTimeElements(node) {
  const elements = []
  for (const child of node.children) {
    if (child.tagName !== 'Dimension' && child.tagName !== 'Extent') {
      continue
    }
    const name = child.getAttribute('name')
    if (name === 'time' || name === 'reference_time') {
      elements.push(child)
    }
  }
  return elements
}
