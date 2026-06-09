import 'highlight.js/styles/monokai-sublime.css'

import { DataType } from '@baita/shared'
import hljs from 'highlight.js'
import { FC, useEffect, useRef } from 'react'

import { ComponentProps } from '.'

const Highlight: FC<{ data: DataType; language?: string } & ComponentProps> = ({
  data,
  language = 'json',
  className,
  style,
}) => {
  const codeNode = useRef(null)

  useEffect(() => {
    if (codeNode.current) {
      hljs.highlightElement(codeNode.current)
    }
  }, [codeNode])

  return (
    <pre className={className} style={{ ...style, margin: 0 }}>
      <code ref={codeNode} className={`rounded language-${language}`}>
        {JSON.stringify(data, null, 2)}
      </code>
    </pre>
  )
}

export default Highlight
