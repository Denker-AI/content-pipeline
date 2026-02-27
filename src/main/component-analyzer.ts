import type {
  AsyncPatternInfo,
  ComponentAnalysis,
  InteractionInfo,
  PropInfo,
  StateHookInfo
} from '@/shared/types'

/**
 * Regex-based TSX source analyzer.
 * Extracts props, interactions, state hooks, async patterns, and animations
 * from component source code without requiring an AST parser.
 */
export function analyzeComponentSource(source: string): ComponentAnalysis {
  return {
    props: extractProps(source),
    interactions: extractInteractions(source),
    stateHooks: extractStateHooks(source),
    asyncPatterns: extractAsyncPatterns(source),
    ...extractAnimations(source)
  }
}

function extractProps(source: string): PropInfo[] {
  const props: PropInfo[] = []

  // Match interface/type Props blocks: interface FooProps { ... } or type FooProps = { ... }
  const propsBlockRe =
    /(?:interface|type)\s+\w*Props\w*\s*(?:=\s*)?\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  let match: RegExpExecArray | null

  while ((match = propsBlockRe.exec(source)) !== null) {
    const block = match[1]
    // Match individual prop lines: name: type or name?: type
    const propLineRe = /(\w+)\??\s*:\s*([^;\n]+)/g
    let propMatch: RegExpExecArray | null
    while ((propMatch = propLineRe.exec(block)) !== null) {
      const name = propMatch[1]
      const type = propMatch[2].trim()
      props.push({
        name,
        type,
        isCallback: /^on[A-Z]/.test(name)
      })
    }
  }

  return props
}

function extractInteractions(source: string): InteractionInfo[] {
  const interactions: InteractionInfo[] = []
  const seen = new Set<string>()

  // Match JSX event handlers: onClick={...}, onSubmit={...}, onChange={...}
  const eventRe =
    /(on(?:Click|Submit|Change|Focus|Blur|KeyDown|KeyUp|MouseEnter|MouseLeave|DragStart|Drop))\s*=\s*\{/g
  const lines = source.split('\n')

  let match: RegExpExecArray | null
  while ((match = eventRe.exec(source)) !== null) {
    const event = match[1]
    const pos = match.index

    // Find nearby label: look at surrounding lines for text content
    const lineIdx = source.slice(0, pos).split('\n').length - 1
    let label = ''

    // Search nearby lines (up to 3 before/after) for text content or aria-label
    for (
      let i = Math.max(0, lineIdx - 3);
      i < Math.min(lines.length, lineIdx + 4);
      i++
    ) {
      const line = lines[i]
      // Check for string content between JSX tags: >text<
      const textMatch = />([^<>{]+)</g.exec(line)
      if (textMatch && textMatch[1].trim()) {
        label = textMatch[1].trim()
        break
      }
      // Check for aria-label or title
      const ariaMatch = /(?:aria-label|title|placeholder)="([^"]+)"/.exec(line)
      if (ariaMatch) {
        label = ariaMatch[1]
        break
      }
    }

    const key = `${event}:${label}`
    if (!seen.has(key)) {
      seen.add(key)
      interactions.push({ event, label })
    }
  }

  return interactions
}

function extractStateHooks(source: string): StateHookInfo[] {
  const hooks: StateHookInfo[] = []

  // Match useState calls: const [foo, setFoo] = useState(initialValue)
  const useStateRe =
    /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState(?:<[^>]*>)?\(([^)]*)\)/g

  let match: RegExpExecArray | null
  while ((match = useStateRe.exec(source)) !== null) {
    const name = match[1]
    const setter = match[2]
    const initialValue = match[3].trim()

    hooks.push({
      name,
      setter,
      initialValue,
      purpose: inferStatePurpose(name, initialValue)
    })
  }

  return hooks
}

function inferStatePurpose(
  name: string,
  initialValue: string
): StateHookInfo['purpose'] {
  const nameLower = name.toLowerCase()

  if (
    nameLower.includes('loading') ||
    nameLower.includes('pending') ||
    nameLower.includes('submitting') ||
    nameLower.includes('fetching')
  ) {
    return 'loading-state'
  }

  if (
    (initialValue === 'false' || initialValue === 'true') &&
    (nameLower.startsWith('is') ||
      nameLower.startsWith('show') ||
      nameLower.startsWith('has') ||
      nameLower.includes('open') ||
      nameLower.includes('active') ||
      nameLower.includes('visible') ||
      nameLower.includes('expanded'))
  ) {
    return 'toggle'
  }

  if (
    initialValue === "''" ||
    initialValue === '""' ||
    initialValue === '``'
  ) {
    if (
      nameLower.includes('text') ||
      nameLower.includes('input') ||
      nameLower.includes('query') ||
      nameLower.includes('search') ||
      nameLower.includes('value') ||
      nameLower.includes('message')
    ) {
      return 'text-input'
    }
  }

  if (
    nameLower.includes('selected') ||
    nameLower.includes('active') ||
    nameLower.includes('current') ||
    nameLower.includes('tab') ||
    nameLower.includes('step')
  ) {
    return 'selection'
  }

  if (
    nameLower.includes('count') ||
    nameLower.includes('index') ||
    nameLower.includes('page')
  ) {
    return 'counter'
  }

  return 'generic'
}

function extractAsyncPatterns(source: string): AsyncPatternInfo[] {
  const patterns: AsyncPatternInfo[] = []

  // Check for fetch calls
  if (/\bfetch\s*\(/.test(source)) {
    const fetchMatch = /\bfetch\s*\([^)]*\)/.exec(source)
    patterns.push({
      type: 'fetch',
      context: fetchMatch ? fetchMatch[0].slice(0, 80) : 'fetch call'
    })
  }

  // Check for setTimeout
  if (/\bsetTimeout\s*\(/.test(source)) {
    const timeoutMatch = /\bsetTimeout\s*\([^,]*,\s*(\d+)/.exec(source)
    patterns.push({
      type: 'setTimeout',
      context: timeoutMatch ? `${timeoutMatch[1]}ms delay` : 'setTimeout call'
    })
  }

  // Check for async/await (in function bodies, not imports)
  if (/\basync\s+(?:function|\()/.test(source) || /\bawait\s+/.test(source)) {
    patterns.push({
      type: 'async-await',
      context: 'async function with await'
    })
  }

  // Check for Promise usage
  if (/new\s+Promise\b/.test(source) || /\.then\s*\(/.test(source)) {
    patterns.push({
      type: 'promise',
      context: 'Promise chain'
    })
  }

  return patterns
}

function extractAnimations(
  source: string
): Pick<ComponentAnalysis, 'hasAnimations' | 'animationTypes'> {
  const animationTypes: string[] = []

  if (/\btransition[-:]/.test(source) || /\btransition\s/.test(source)) {
    animationTypes.push('transition')
  }

  if (
    /framer-motion|from\s+['"]motion['"]|motion\./.test(source)
  ) {
    animationTypes.push('framer-motion')
  }

  if (/@keyframes\b/.test(source) || /keyframes\s*\(/.test(source)) {
    animationTypes.push('keyframes')
  }

  if (/\banimation[-:]/.test(source) || /\banimation\s/.test(source)) {
    animationTypes.push('css-animation')
  }

  if (/\btransform[-:]/.test(source) || /\btransform\s/.test(source)) {
    animationTypes.push('transform')
  }

  return {
    hasAnimations: animationTypes.length > 0,
    animationTypes
  }
}
