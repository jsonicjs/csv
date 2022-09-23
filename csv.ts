/* Copyright (c) 2021-2022 Richard Rodger, MIT License */


// TODO: strict needs own stringMatcher for csv style strings

import {
  Jsonic,
  Rule,
  RuleSpec,
  // StateAction,
  Plugin,
  Context,
  // Token,
  Config,
  Options,
  Lex,
  util,
  EMPTY,
} from '@jsonic/jsonic-next'

type CsvOptions = {
  strict: boolean
}


const { deep, charset, omap, keys, clean } = util


const Csv: Plugin = (jsonic: Jsonic, options: CsvOptions) => {

  jsonic.lex(makeCsvStringMatcher)


  const strict = !!options.strict

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
      ignore: strict ? [null, null, null] : [],
    },
    // space: {
    //   // lex: !strict,
    // },
    number: {
      lex: !strict,
    },
    value: {
      lex: !strict,
    },
    // string: {
    //   escapedouble: true,
    // },
    // token: token,
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


  let { LN, TX, SP, ZZ } = jsonic.token


  jsonic.rule('csv', (rs: RuleSpec): RuleSpec => {
    rs
      .open({ p: 'record' })
      .bo((rule: Rule) => {
        rule.node = []
      })

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
          rule.node.push(record)
        }
      })
    return rs
  })

  jsonic.rule('val', (rs: RuleSpec) => {
    return rs
      .open({ s: [SP], b: 1, p: 'text' }, { append: false })
      .open({ s: [TX, SP], b: 2, p: 'text' }, { append: false })
  })

  jso

  NEED TO SET PARENT VAL NODE

  nic.rule('text', (rs: RuleSpec) => {
    return rs
      .open([
        {
          // NOTE: r in open means no close except final
          s: [TX, SP], b: 1, r: 'text', n: { text: 1 },
          a: (r: Rule) => {
            let v = (1 === r.n.text ? r : r.prev)
            r.node = v.node = (1 === r.n.text ? '' : r.prev.node) + r.o0.src
            console.log('TEXT AA', v.node)
          }
        },
        {
          s: [SP, TX], r: 'text', n: { text: 1 },
          a: (r: Rule) => {
            let v = (1 === r.n.text ? r : r.prev)
            r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
              (2 <= r.n.text ? r.o0.src : '') +
              r.o1.src
            console.log('TEXT BB', v.node)
          }
        },
        { s: [SP] },
        {},
      ])
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
  strict: true,
} as CsvOptions

export {
  Csv,
  makeCsvStringMatcher,
}

export type { CsvOptions }
