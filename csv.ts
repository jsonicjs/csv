/* Copyright (c) 2021-2022 Richard Rodger, MIT License */


// TODO: strict needs own stringMatcher for csv style strings

import {
  Jsonic,
  Rule,
  RuleSpec,
  StateAction,
  Plugin,
  Context,
  Token,
} from '@jsonic/jsonic-next'

type CsvOptions = {
  strict: boolean
  // name: string
  // open: string
  // action: StateAction | string
  // close?: string
  // rules?: string | string[]
}

const Csv: Plugin = (jsonic: Jsonic, options: CsvOptions) => {

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
    space: {
      lex: !strict,
    },
    number: {
      lex: !strict,
    },
    value: {
      lex: !strict,
    },
    string: {
      escapedouble: true,
    },
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

  // If strict, don't parse JSON structures inside fields.
  // NOTE: this is how you "turn off" tokens
  // if (jsonicOptions.strict) {
  //   token['#OB'] = false
  //   token['#CB'] = false
  //   token['#OS'] = false
  //   token['#CS'] = false
  //   token['#CL'] = false

  //   token['#ST'] = '"'

  //   jsonicOptions.number = { lex: false }
  //   jsonicOptions.comment = false

  //   jsonicOptions.string.multiline = ''
  //   jsonicOptions.string.block = {}

  //   jsonicOptions.value = {}
  // }

  jsonic.options(jsonicOptions)



  let LN = jsonic.token.LN
  let ZZ = jsonic.token.ZZ


  // Match alt only if first occurrence of rule 
  // let first = (rule: Rule, ctx: Context) => {
  //   let use: any = ctx.use.csv = (ctx.use.csv || {})
  //   let frm: any = use.frm = (use.frm || { val: true, list: true, record: true })
  //   let res = (frm[rule.name] && (frm[rule.name] = false, true)) // locking latch
  //   return res
  // }

  // jsonic.rule('val', rs => {
  //   rs.open(
  //     // { c: first, p: 'list' },
  //     { c: { d: 0 }, p: 'list' },
  //     { append: false }
  //   )
  //   return rs
  // })

  // jsonic.rule('list', (rs: RuleSpec): RuleSpec => {
  //   rs.def.open.unshift(
  //     { c: first, p: 'record' }
  //   )
  //   return rs
  // })

  jsonic.rule('csv', (rs: RuleSpec): RuleSpec => {
    rs
      .open({ p: 'record' })
      .bo((rule: Rule, ctx: Context) => {
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
            // if (null == field_name) {
            //   let out = {
            //     err: 'csv_unexpected_field',
            //     fsrc: ctx.v1.src,
            //     index: i,
            //     len: fields.length,
            //     row: ctx.v1.rI,
            //   }
            //   return out
            // }
            record[field_name] = list[i]
          }
          rule.node.push(record)
        }
      })
    return rs
  })

  //   let rules: string[] = (
  //     'string' == typeof options.rules
  //       ? options.rules.split(/\s*,\s*/)
  //       : options.rules || []
  //   ).filter((rulename) => '' !== rulename)
  //   let name = options.name
  //   let open = options.open
  //   let close = options.close
  //   let action: StateAction

  //   if ('string' === typeof options.action) {
  //     let path = options.action
  //     action = (rule: Rule) =>
  //       (rule.node = jsonic.util.prop(jsonic.options, path))
  //   } else {
  //     action = options.action
  //   }

  //   let token: Record<string, string> = {}

  //   let openTN = '#D_open_' + name
  //   let closeTN = '#D_close_' + name

  //   let OPEN = jsonic.fixed(open)
  //   let CLOSE = null == close ? null : jsonic.fixed(close)

  //   // OPEN must be unique
  //   if (null != OPEN) {
  //     throw new Error('Csv open token already in use: ' + open)
  //   } else {
  //     token[openTN] = open
  //   }

  //   // Only create CLOSE if not already defined as a fixed token
  //   if (null == CLOSE && null != close) {
  //     token[closeTN] = close
  //   }

  //   jsonic.options({
  //     fixed: {
  //       token,
  //     },
  //     error: {
  //       [name + '_close']:
  //         null == close
  //           ? null
  //           : 'csv ' +
  //           name +
  //           ' close "' +
  //           close +
  //           '" without open "' +
  //           open +
  //           '"',
  //     },
  //     hint: {
  //       [name + '_close']:
  //         null == close
  //           ? null
  //           : `
  // The ${name} csv must start with the characters "${open}" and end
  // with the characters "${close}". The end characters "${close}" may not
  // appear without the start characters "${open}" appearing first:
  // "${open}...${close}".
  // `,
  //     },
  //   })

  //   let CA = jsonic.token.CA
  //   OPEN = jsonic.fixed(open)
  //   CLOSE = null == close ? null : jsonic.fixed(close)

  //   // NOTE: RuleSpec.open|close refers to Rule state, whereas
  //   // OPEN|CLOSE refers to opening and closing tokens for the csv.

  //   rules.forEach((rulename) => {
  //     jsonic.rule(rulename, (rs: RuleSpec) => {
  //       rs.open({ s: [OPEN], p: name, n: { dr: 1 } })

  //       if (null != close) {
  //         rs.open([
  //           {
  //             s: [CLOSE],
  //             c: { n: { dr: 0 } },
  //             e: (_r: Rule, ctx: any) => ctx.t0.bad(name + '_close'),
  //           },

  //           // <2,> case
  //           {
  //             s: [CLOSE],
  //             b: 1,
  //           },
  //         ])

  //         rs.close({ s: [CLOSE], b: 1 })
  //       }

  //       return rs
  //     })
  //   })


  //   jsonic.rule(name, (rs) =>
  //     rs
  //       .clear()
  //       .bo((rule: Rule) => ((rule.node = {}), undefined))
  //       .open([
  //         {
  //           p: 'val',

  //           // Only accept implicits when there is a CLOSE token,
  //           // otherwise we'll eat all following siblings.
  //           n: null == close ? {} : { pk: -1, il: 0 },
  //         },
  //       ])
  //       .bc(function(
  //         this: RuleSpec,
  //         rule: Rule,
  //         ctx: Context,
  //         next: Rule,
  //         tkn?: Token | void
  //       ) {
  //         let out = action.call(this, rule, ctx, next, tkn)
  //         if (out?.isToken) {
  //           return out
  //         }
  //       })
  //       .close(null != close ? [{ s: [CLOSE] }, { s: [CA, CLOSE] }] : [])
  //   )


}

Csv.defaults = {
  // rules: 'val,pair,elem',
  strict: true,
} as CsvOptions

export { Csv }

export type { CsvOptions }
