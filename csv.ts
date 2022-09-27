/* Copyright (c) 2021-2022 Richard Rodger, MIT License */

// NOTE: Good example of use case for `r` control in open rule.


// TODO: strict needs own stringMatcher for csv style strings

import {
  Jsonic,
  Rule,
  RuleSpec,
  Plugin,
  Context,
  Config,
  Options,
  Lex,
  EMPTY,
} from '@jsonic/jsonic-next'

type CsvOptions = {
  trim: boolean | null
  comment: boolean | null
  number: boolean | null
  stream: null | ((what: string, record?: Record<string, any> | Error) => void)
  strict: boolean
}




const Csv: Plugin = (jsonic: Jsonic, options: CsvOptions) => {
  const strict = !!options.strict
  const stream = options.stream

  let trim = !!options.trim
  let comment = !!options.comment
  let number = !!options.number

  if (strict) {
    jsonic.lex(makeCsvStringMatcher)
  }
  else {
    trim = null === options.trim ? true : trim
    comment = null === options.comment ? true : comment
    number = null === options.number ? true : number
  }

  if (stream) {
    let parser = jsonic.internal().parser
    let origStart = parser.start.bind(parser)
    parser.start = (...args: any[]) => {
      try {
        return origStart(...args)
      }
      catch (e: any) {
        stream('error', e)
      }
    }
  }


  let token = {}
  if (strict) {
    // Disable JSON structure tokens
    token = {
      '#OB': null,
      '#CB': null,
      '#OS': null,
      '#CS': null,
      '#CL': null,
    }
  }

  let jsonicOptions: any = {
    rule: {
      start: 'csv',
    },
    fixed: {
      token
    },
    tokenSet: {
      ignore: strict ? [null, null, comment ? undefined : null] : [null, null],
    },
    number: {
      lex: number,
    },
    value: {
      lex: !strict,
    },
    comment: {
      lex: comment,
    },
    error: {
      csv_unexpected_field: 'unexpected field value: $fsrc'
    },
    hint: {
      csv_unexpected_field:
        `Row $row has too many fields (the first of which is: $fsrc). Only $len
fields per row are expected.`,
    },
  }


  jsonic.options(jsonicOptions)


  let { LN, CA, TX, SP, ZZ } = jsonic.token


  jsonic.rule('csv', (rs: RuleSpec): RuleSpec => {
    rs
      .open({ p: 'record' })
      .bo((rule: Rule) => {
        stream && stream('start')
        rule.node = []
      })
      .ac(() => { (stream && stream('end')) })

    return rs
  })

  jsonic.rule('elem', (rs: RuleSpec) => {
    rs.close({ s: [LN], b: 1 }, { append: false }) // End list and record
    return rs
  })

  jsonic.rule('record', (rs: RuleSpec) => {
    rs.
      open([
        { s: [LN], r: 'record' },
        { p: 'list' },
      ])
      .close([
        { s: [ZZ] }, // EOF also ends CSV
        { s: [LN, ZZ] },
        { s: [LN], r: 'record' }
      ])
      .bc((rule: Rule, ctx: Context) => {
        let fields: string[] = ctx.use.fields

        // First line is fields
        if (null == fields) {
          fields = ctx.use.fields = rule.child.node
        }
        else {
          let list = rule.child.node
          let record: Record<string, any> = {}
          for (let i = 0; i < list.length; i++) {
            let field_name = fields[i]
            record[field_name] = list[i]
          }

          if (stream) {
            stream('record', record)
          }
          else {
            rule.node.push(record)
          }
        }
      })
    return rs
  })

  jsonic.rule('val', (rs: RuleSpec) => {
    return rs
      .open([
        { s: [TX, SP], b: 2, p: 'text' },
        { s: [SP], b: 1, p: 'text' }
      ], { append: false })
  })


  jsonic.rule('text', (rs: RuleSpec) => {
    return rs

      // Space within non-space is preserved as part of text value.
      .open([
        {
          // NOTE: r in open means no close except final
          s: [TX, SP], b: 1, r: 'text', n: { text: 1 },
          g: 'csv,space,follows',
          a: (r: Rule) => {
            // Keep appending to prev node
            let v = (1 === r.n.text ? r : r.prev)
            r.node = v.node = (1 === r.n.text ? '' : r.prev.node) + r.o0.src
          }
        },
        {
          s: [SP, TX], r: 'text', n: { text: 1 },
          g: 'csv,space,leads',
          a: (r: Rule) => {
            let v = (1 === r.n.text ? r : r.prev)
            r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
              (2 <= r.n.text || !trim ? r.o0.src : '') +
              r.o1.src
            // console.log('TEXT BB', v.node)
          }
        },
        {
          s: [SP, [CA, LN, ZZ]], b: 1, n: { text: 1 },
          g: 'csv,end',
          a: (r: Rule) => {
            let v = (1 === r.n.text ? r : r.prev)
            r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
              (!trim ? r.o0.src : '')
          },
        },
        {
          s: [SP], n: { text: 1 },
          g: 'csv,space',
          a: (r: Rule) => {
            if (strict) {
              let v = (1 === r.n.text ? r : r.prev)
              r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
                (!trim ? r.o0.src : '')
            }
          },
          p: strict ? undefined : 'val'
        },

        // Accept anything after text.
        {},
      ])

      // Close is called on final rule - set parent val node
      .bc((r: Rule) => {
        // console.log('TEXT BC',
        // r.parent + '', r.parent.node,
        //   r + '', r.node,
        //   r.child + '', r.child.node)
        // r.parent.node = 'val' === r.child.name ? r.child.node : r.node
        r.parent.node = undefined === r.child.node ? r.node : r.child.node
      })
  })
}


function makeCsvStringMatcher(cfg: Config, _opts: Options) {

  return function csvStringMatcher(lex: Lex) {
    let quoteMap: any = { '"': true }

    let { pnt, src } = lex
    let { sI, rI, cI } = pnt
    let srclen = src.length

    if (quoteMap[src[sI]]) {
      const q = src[sI] // Quote character
      const qI = sI
      const qrI = rI
      ++sI
      ++cI

      let s: string[] = []
      // let rs: string | undefined

      for (sI; sI < srclen; sI++) {
        cI++
        let c = src[sI]
        // console.log(100, sI, c, s)

        // Quote char.
        if (q === c) {
          sI++
          cI++

          if (q === src[sI]) {
            s.push(q)
            // console.log(300, sI, src[sI], s)
          }
          else {
            break // String finished.
          }
        }

        // Body part of string.
        else {
          let bI = sI

          // TODO: move to cfgx
          let qc = q.charCodeAt(0)
          let cc = src.charCodeAt(sI)

          while (
            sI < srclen &&
            32 <= cc &&
            qc !== cc
          ) {
            cc = src.charCodeAt(++sI)
            cI++
          }
          cI--

          if (cfg.line.chars[src[sI]]) {
            if (cfg.line.rowChars[src[sI]]) {
              pnt.rI = ++rI
            }

            cI = 1
            s.push(src.substring(bI, sI + 1))
          }
          else if (cc < 32) {
            pnt.sI = sI
            pnt.cI = cI
            return lex.bad('unprintable', sI, sI + 1)
          }
          else {
            s.push(src.substring(bI, sI))
            sI--
            // console.log(800, sI, s)
          }
        }
      }

      if (src[sI - 1] !== q || pnt.sI === sI - 1) {
        pnt.rI = qrI
        return lex.bad('unterminated_string', qI, sI)
      }

      const tkn = lex.token(
        '#ST',
        s.join(EMPTY),
        src.substring(pnt.sI, sI),
        pnt
      )

      // console.log('TKN', tkn)

      pnt.sI = sI
      pnt.rI = rI
      pnt.cI = cI
      return tkn
    }
  }
}



Csv.defaults = {
  // Trim surrounding space. Default: false (!strict=>true)
  trim: null,

  // Support comments. Default: false (!strict=>true)
  comment: null,

  // Support numbers. Default: false (!strict=>true)
  number: null,

  // Stream records.
  stream: null,

  // Parse standard CSV, ignoring embedded JSON. Default: false.
  // When true, changes some defaults, e.g. trim=>true 
  strict: true,
} as CsvOptions

export {
  Csv,
  makeCsvStringMatcher,
}

export type { CsvOptions }
