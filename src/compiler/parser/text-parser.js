/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

// 匹配 mustache 语法所用的正则表达式
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

/** 文本内容解析 */
export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  if (!tagRE.test(text)) {
    return // 匹配不到 mustache 语法，说明为纯文本，直接返回
  }
  const tokens = []
  const rawTokens = []
  let lastIndex = tagRE.lastIndex = 0 // 上一次匹配结束的位置
  let match, index, tokenValue
  while ((match = tagRE.exec(text))) {
    index = match.index
    // 当前匹配到的开始位置大于上一次匹配到的结束的位置，说明中间有纯文本内容
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // 双括号中匹配的内容进行过滤器解析，得到双括号中的内容
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) { // 还有剩余纯文本内容需要处理
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
