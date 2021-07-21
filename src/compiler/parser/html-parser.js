/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'

/*
/^/：/^ 至 / 间的内容要出现在字符串开头
\s*：匹配属性名前的空格（零或多个空格）
([^\s"'<>\/=]+)：匹配属性名（一至多个字符，空格_"_'_<_>_/_= 除外）
(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?
    (?:)?
    \s*(=)\s*：匹配等号及等号前后的空格
    (?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+))
        (?:)
        "([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)：匹配属性值
            "([^"]*)"+：匹配匹配双引号括起的属性值，双引号中不能存在双引号，最后一个双引号可存在多个
            '([^']*)'+：匹配匹配单引号括起的属性值，单引号中不能存在单引号，最后一个单引号可存在多个
            ([^\s"'=<>`]+)：匹配一至多个字符，空格_"_'_=_<_>_` 除外
*/
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = '[a-zA-Z_][\\w\\-\\.]*' // 以字母或下划线开头，后接零或多个字符（字母/数字/下划线/-/.）
const qnameCapture = `((?:${ncname}\\:)?${ncname})` // 匹配开始标签的标签名，包含命名空间
const startTagOpen = new RegExp(`^<${qnameCapture}`) // 匹配开始标签的开头，通过组匹配可取出标签名
const startTagClose = /^\s*(\/?)>/ // 匹配开始标签的结尾，通过组匹配可判断该标签是否为自闭合标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`) // 匹配结束标签，[^>]*用于匹配标签名后书写的错误字符，ex.</div+*>
const doctype = /^<!DOCTYPE [^>]+>/i // 匹配 DOCTYPE，且忽略大小写
// #7298: escape - to avoid being pased as HTML comment when inlined in page
const comment = /^<!\--/ // 匹配注释开始标签
const conditionalComment = /^<!\[/ // 匹配条件注释开始标签

let IS_REGEX_CAPTURING_BROKEN = false
'x'.replace(/x(.)?/g, function (m, g) {
  IS_REGEX_CAPTURING_BROKEN = g === ''
})

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap('script,style,textarea', true)
const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t'
}
const encodedAttr = /&(?:lt|gt|quot|amp);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

function decodeAttr (value, shouldDecodeNewlines) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr
  return value.replace(re, match => decodingMap[match])
}

export function parseHTML (html, options) {
  const stack = []
  const expectHTML = options.expectHTML // true
  const isUnaryTag = options.isUnaryTag || no // 用于判断是否为自闭合标签
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no // 用于判断是否为自补全标签
  let index = 0 // 记录模板字符串处理的索引
  let last, lastTag // 上一次处理的模板字符串，上一次处理的标签
  while (html) {
    last = html
    // lastTag 不存在
    // 或
    // lastTag 存在 && lastTag 不能为 script/style 这样的 plaintext content element
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<')
      if (textEnd === 0) {
        // 标签为注释标签
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->') // 获取注释节点结束位置

          if (commentEnd >= 0) {
            if (options.shouldKeepComment) { // 根据选项判断是否保留注释
              options.comment(html.substring(4, commentEnd)) // 创建注释 ast 元素
            }
            advance(commentEnd + 3) // 移动索引
            continue
          }
        }

        // 标签为条件注释标签
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        // 标签为 Doctype
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue
        }

        // 标签为结束标签
        const endTagMatch = html.match(endTag)
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        // 标签为开始标签
        const startTagMatch = parseStartTag()
        if (startTagMatch) {
          handleStartTag(startTagMatch)
          if (shouldIgnoreFirstNewline(lastTag, html)) {
            advance(1)
          }
          continue
        }
      }

      let text, rest, next
      if (textEnd >= 0) { // 标签前有文本内容，ex.abc<div>
        rest = html.slice(textEnd)
        while (// 不是合法标签，< 在文本中，ex.<abc
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          next = rest.indexOf('<', 1)
          if (next < 0) break
          textEnd += next
          rest = html.slice(textEnd)
        }
        text = html.substring(0, textEnd)
        advance(textEnd)
      }

      // 不存在标签时
      if (textEnd < 0) {
        text = html
        html = ''
      }

      // 创建文本 ast 元素
      if (options.chars && text) {
        options.chars(text)
      }
    } else {
      let endTagLength = 0
      const stackedTag = lastTag.toLowerCase()
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'))
      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    // html 内容无法解析时，当作文本处理
    if (html === last) {
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`)
      }
      break
    }
  }

  // 清理多余的不配对开始标签
  parseEndTag()

  /** 移动模板字符串当前处理的索引 */
  function advance (n) {
    index += n
    html = html.substring(n)
  }

  /** 解析开始标签 */
  function parseStartTag () {
    // 匹配开始标签的开头，ex.<ul
    const start = html.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index // 记录标签开始的索引
      }
      advance(start[0].length)

      // 匹配开始标签的结尾与开始标签中的属性，ex.> :xxx="count"
      let end, attr
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length)
        match.attrs.push(attr)
      }
      if (end) {
        match.unarySlash = end[1] // 通过 end[1] 是否存在可判断是否为自闭合标签
        advance(end[0].length)
        match.end = index // 记录标签结束的索引
        return match
      }
    }
  }

  /** 处理解析后开始标签的数据 */
  function handleStartTag (match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash

    if (expectHTML) {
      // 父元素为 p 标签，当前元素不能放在 p 标签下
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        parseEndTag(lastTag) // 闭合 p 标签
      }
      // 父元素为自补全标签，当前标签与父元素标签相同，则闭合父元素。ex.<p><p> ————> <p></p><p>
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        parseEndTag(tagName)
      }
    }

    // 是否为自闭合标签
    const unary = isUnaryTag(tagName) || !!unarySlash

    // 属性处理
    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      // 兼容火狐浏览器，火狐浏览器组匹配不到时返回空字符串，需将其转换为 undefined
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        if (args[3] === '') { delete args[3] }
        if (args[4] === '') { delete args[4] }
        if (args[5] === '') { delete args[5] }
      }
      // 获取属性值
      const value = args[3] || args[4] || args[5] || ''
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, shouldDecodeNewlines)
      }
    }

    if (!unary) { // 非自闭合标签进行压栈处理，确保开始结束标签配对
      stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs })
      lastTag = tagName // 记录上一次处理的标签名
    }

    if (options.start) { // 为开始标签创建 ast 元素
      options.start(tagName, attrs, unary, match.start, match.end)
    }
  }

  /** 解析结束标签 */
  function parseEndTag (tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    if (tagName) { // 缓存小写的结束标签名
      lowerCasedTagName = tagName.toLowerCase()
    }

    // 标签名存在，寻找对应的开始标签
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    }
    // 结束标签无标签名时，用于模板解析结束后清理多余的不配对开始标签
    else {
      pos = 0
    }

    if (pos >= 0) {
      // 关闭结束标签与对应开始标签中间的不配对开始标签 && 关闭对应的开始标签
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) { // 警告提示：发现了不配对的标签
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }

      // 清理栈中对应的开始标签以及不配对的开始标签
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag // 更新上一次处理的标签
    }
    // br 标签找不到开始标签时，为其创建自闭合的 ast 元素
    else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    }
    // p 标签找不到开始标签时，为其创建 ast 元素
    else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
