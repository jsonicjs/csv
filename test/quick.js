
const Jsonic = require('@jsonic/jsonic-next')
const { Csv } = require('..')


const csv = Jsonic.make().use(Csv)

console.log(csv.internal().config)

console.log(csv(`a,b
1, 2
11 ,{22
3 3, "a"
`,{log:-1}))
