
module.exports = {
  happy: {
    raw: `a,b,c
1,B,true
2,BB,false
`,
    out: [{a:'1',b:'B',c:'true'},{a:'2',b:'BB',c:'false'}]
  },

  quote: {
    raw: `a,b,c
"1","B","true"
"2","B""B","false"
`,
    out: [{a:'1',b:'B',c:'true'},{a:'2',b:'B"B',c:'false'}]
  },

  
  notrim: {
    raw: `a,b,c
1 , 2 , 3
 11 ,  22   , 33 
4\t,\t5\t,\t6
\t44\t,\t\t55\t\t\t,\t66\t
`,
    out: [
      {
        a: '1 ',
        b: ' 2 ',
        c: ' 3',
      },
      {
        a: ' 11 ',
        b: '  22   ',
        c: ' 33 ',
      },
      {
        a: '4\t',
        b: '\t5\t',
        c: '\t6',
      },
      {
        a: '\t44\t',
        b: '\t\t55\t\t\t',
        c: '\t66\t',
      },
    ]
  },

  trim: {
    opt: { trim: true },
    rawref: 'notrim',
    out: [
      {
        a: '1',
        b: '2',
        c: '3',
      },
      {
        a: '11',
        b: '22',
        c: '33',
      },
      {
        a: '4',
        b: '5',
        c: '6',
      },
      {
        a: '44',
        b: '55',
        c: '66',
      },
    ]
  },

}
