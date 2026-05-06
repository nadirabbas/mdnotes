import { marked } from 'marked'
import hljs from 'highlight.js'

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderer = new marked.Renderer()
renderer.code = (codeOrToken, lang) => {
  const text = (typeof codeOrToken === 'object' ? codeOrToken.text : codeOrToken) || ''
  const info = (typeof codeOrToken === 'object' ? codeOrToken.lang : lang) || ''
  const language = hljs.getLanguage(info) ? info : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
}

marked.use({ renderer })

export function renderMarkdown(content) {
  return marked.parse(content || '')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

export function debounce(fn, delay) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}

// Coordinate calculation for textarea cursor/selection
export function getCaretCoordinates(element, position) {
  const div = document.createElement('div')
  const style = window.getComputedStyle(element)
  
  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
    'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
  ]

  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordBreak = 'break-word'
  
  properties.forEach(prop => { div.style[prop] = style[prop] })
  
  // Extra adjustments for textarea
  div.textContent = element.value.substring(0, position)
  
  const span = document.createElement('span')
  span.textContent = element.value.substring(position) || '.'
  div.appendChild(span)
  
  document.body.appendChild(div)
  const rect = span.getBoundingClientRect()
  const parentRect = element.getBoundingClientRect()
  
  const coords = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
    height: parseFloat(style.lineHeight)
  }
  
  document.body.removeChild(div)
  return coords
}

export function getSelectionRects(element, start, end) {
  if (start === end) return []
  const rects = []
  
  const div = document.createElement('div')
  const style = window.getComputedStyle(element)
  const properties = [
    'direction', 'boxSizing', 'width', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'fontFamily', 'tabSize'
  ]
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordBreak = 'break-word'
  properties.forEach(prop => { div.style[prop] = style[prop] })
  
  div.textContent = element.value.substring(0, start)
  const span = document.createElement('span')
  span.textContent = element.value.substring(start, end)
  span.style.background = 'blue' // Dummy background to calculate rects
  div.appendChild(span)
  
  document.body.appendChild(div)
  
  // Use a Range to get accurate rects if possible, or just the span's client rects
  const range = document.createRange()
  range.selectNodeContents(span)
  const clientRects = range.getClientRects()
  const divRect = div.getBoundingClientRect()
  
  for (const r of clientRects) {
    rects.push({
      top: r.top - divRect.top - element.scrollTop,
      left: r.left - divRect.left - element.scrollLeft,
      width: r.width,
      height: r.height
    })
  }
  
  document.body.removeChild(div)
  return rects
}

