
const Jsonic = require('@jsonic/jsonic-next')
const { Csv } = require('..')


const csv = Jsonic.make().use(Csv)

console.log(csv.options.tokenSet)
console.log(csv.internal().config.tokenSet)

// console.log(csv(`a,b
// 1, 2
// 11 ,{22
// 3 3, "a"
// `,{xlog:-1}))


// console.log(csv(`a,b
// 1,2
// 3,"x""y"
// 4,5
// `,{xlog:-1}))


console.log(csv(`a,b
1, 2 3 
4,  5  6  
7,	8		9	
10, 11 12 13 
`,{log:-1}))
