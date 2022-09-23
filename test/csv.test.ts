/* Copyright (c) 2021-2022 Richard Rodger and other contributors, MIT License */

import Util from 'util'

import { Jsonic, Rule } from '@jsonic/jsonic-next'
import { Csv } from '../csv'

const Spectrum = require('csv-spectrum')



describe('csv', () => {

  test('double-quote', async () => {
    const j = Jsonic.make().use(Csv)

  })

  test('spectrum', async () => {
    const j = Jsonic.make().use(Csv)
    const tests = await Util.promisify(Spectrum)()
    for (let i = 0; i < tests.length; i++) {
      let test = tests[i]
      let name = test.name
      let json = JSON.parse(test.json.toString())
      let csv = test.csv.toString()
      let res = j(csv)
      let testname = name + ' ' + (i + 1) + '/' + tests.length

      if (3 === i) {
        console.log(json)
        console.log(csv)
      }
      expect({ [testname]: res }).toEqual({ [testname]: json })
    }
  })

})


